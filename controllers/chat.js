import {
  ALERT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHAT
} from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";
import { tryCatch } from "../middlewears/error.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import {
  deleteFileFromCloudinary,
  emitEvent,
  uploadFileToCloudinary,
} from "../utils/featres.js";
import { errHandler } from "../utils/utility.js";

// create new group
export const newGroupChat = tryCatch(async (req, res, next) => {
  const { name, members } = req.body;

  if (members.length > 2) {
    return next(new errHandler("Group chat must have at least 3 members", 400));
  }

  const allMenbers = [...members, req.user];

  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMenbers,
  });

  emitEvent(req, ALERT, allMenbers, `welcome to ${name} group`);
  emitEvent(req, REFETCH_CHAT, members);

  return res.status(201).json({
    success: true,
    message: "Group Created",
  });
});

// ---------------My chats-------------
export const getMyChat = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar",
  );

  const transFormedChats = chats.map(({ _id, name, members, groupChat }) => {
    const otherMember = getOtherMember(members, req.user);

    const memberId = members
      .filter((i) => i._id.toString() !== req.user)
      .map((i) => i._id);
    return {
      _id,
      groupChat,
      name: groupChat ? name : otherMember?.name,
      members: memberId,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember.avatar.url],
    };
  });
  return res
    .status(200)
    .json({ success: true, message: "my chats", chats: transFormedChats });
});

// my groups
export const getMyGroups = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
  }).populate("members", "name avatar");

  const groups = chats.map(({ members, _id, name, groupChat }) => ({
    _id,
    name,
    members,
    groupChat,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  return res.status(200).json({
    success: true,
    groups,
  });
});

// add members
export const addMembers = tryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;

  if (!members) {
    return next(new errHandler("Please provide member"));
  }
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new errHandler("chat not found", 404));
  if (!chat.groupChat) return next(new errHandler("chat not found", 404));

  if (chat.creator.toString() !== req.user.toString()) {
    return next(new errHandler("you are not allowed to add member", 404));
  }

  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));
  const allNewMember = await Promise.all(allNewMembersPromise);

  const uniqueMember = allNewMember
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);

  chat.members.push(...uniqueMember.map((i) => i._id));
  await chat.save();

  const allUserName = allNewMember.map((i) => i.name).join(",");
  emitEvent(req, ALERT, chat.members, `You have been added to ${allUserName}`);

  emitEvent(req, REFETCH_CHAT, chat.members);
  return res.status(200).json({
    success: true,
    message: "Members added successfull",
  });
});

// remove members
export const removeMembers = tryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;

  const [chat, removeUser] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId),
  ]);

  if (!chat) return next(new errHandler("chat not found", 404));
  if (!chat.groupChat) return next(new errHandler("chat not found", 404));

  if (chat.creator.toString() !== req.user.toString()) {
    return next(new errHandler("you are not allowed to add member", 404));
  }

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString(),
  );
  await chat.save();

  emitEvent(req, ALERT, `${removeUser} has been removed from the group`);
  emitEvent(req, REFETCH_CHAT, chat.members);

  return res.status(200).json({
    success: true,
    message: "remove member success",
  });
});

export const leaveGroups = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new errHandler("chat not found"));

  const remanningMember = chat.members.filter(
    (member) => member.toString() !== req.user.toString(),
  );

  if (chat.creator.toString() === req.user.toString()) {
    const randomElement = Math.floor(Math.random() * remanningMember.length);
    const newCreator = remanningMember[randomElement];
    chat.creator = newCreator;
    await chat.save();
  }

  chat.members = remanningMember;
  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, `User ${user.name} has left the group`);

  return res.status(200).json({
    success: true,
    message: "leave group success",
  });
});

export const sendAttachment = tryCatch(async (req, res, next) => {
  const { chatId } = req.body;
  const files = req.files || [];

  if (files.length < 1)
    return next(new errHandler("Please provide attachment"));
  const userId = req.user._id || req.user;

  const [chat, user] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);

  if (!chat) return next(new errHandler("chat not found", 404));

  const attachments = await Promise.all(
    files.map((file) => uploadFileToCloudinary(file)),
  );
  

  const messageForDB = {
    content: "",
    attachments,
    sender: user._id,
    chat: chatId,
  };

  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: user._id,
      name: user.name,
    },
  };

  const message = await Message.create(messageForDB);

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

  return res.status(200).json({ success: true, message });
});

export const getChatsDetails = tryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();

    if (!chat) return next(new errHandler("chat not found", 404));

    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));

    return res.status(200).json({ success: true, chat });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new errHandler("chat not found", 404));

    return res.status(200).json({ success: true, chat });
  }
});

export const renameGroup = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new errHandler("chat not found", 404));
  if (!chat.groupChat)
    return next(new errHandler("this is not a group chat", 404));

 
  if (chat.creator.toString() !== req.user.toString()) {
    return next(new errHandler("Not allow to rename group", 404));
  }

  chat.name = name;
  await chat.save();

  emitEvent(req, REFETCH_CHAT, chat.members);

  return res.status(200).json({
    success: true,
    message: "Group rename success",
  });
});

export const deleteChat = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);
  
  if (!chat) return next(new errHandler("chat not found", 404));

  const member = chat.members;

  if (chat.groupChat && chat.creator.toString() !== req.user.toString())
    return next(new errHandler("Not allowed to delete chat group", 404));

  if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
    return next(
      new errHandler("You are not allowed to delete chat group", 404),
    );
  }

  const messageWithAttachment = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messageWithAttachment.forEach(({ attachments }) =>
    attachments.forEach(({ public_id }) => public_ids.push(public_id)),
  );

  await Promise.all([
    // delete file from cloudinary
    deleteFileFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHAT, member);

  return res
    .status(200)
    .json({ success: true, message: "Group delete success" });
});

export const getMessage = tryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;

  const resultPerPage = 20;
  const skip = (page - 1) * resultPerPage;

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .limit(resultPerPage)
      .skip(skip)
      .populate("sender", "name")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPage = Math.ceil(totalMessagesCount / resultPerPage);

  return res.status(200).json({
    success: true,
    message: messages.reverse(),
    totalPage,
  });
});
// 3:3:46 time
