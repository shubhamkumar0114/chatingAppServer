import { tryCatch } from "../middlewears/error.js";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";

export const allUsers = tryCatch(async (req, res) => {
  const users = await User.find({});

  const transformUsers = await Promise.all(
    users.map(async ({ name, username, _id, avatar }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);

      return {
        name,
        username,
        _id,
        avatar: avatar.url,
        groups,
        friends,
      };
    })
  );

  return res.status(200).json({
    success: true,
    transformUsers,
  });
});

export const allChats = tryCatch(async (req, res, next) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformChats = await Promise.all(
    chats.map(async ({ _id, groupChat, name, creator, members }) => {
      const totalMessages = await Message.find({ chat: _id });
      return {
        _id,
        name,
        groupChat,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => {
          return {
            _id,
            name,
            avatar: avatar.url,
          };
        }),
        creator: {
          name: creator?.name || "none",
          avatar: creator?.avatar.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );
  return res.status(200).json({
    success: true,
    chat: transformChats,
  });
});

export const allMessages = tryCatch(async (req, res) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transFormMessages = messages.map(
    ({ content, attachments, sender, createdAt, _id, chat }) => ({
      content,
      attachments,
      createdAt,
      _id,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    })
  );
  return res.status(200).json({
    success: true,
    messages: transFormMessages,
  });
});

export const getDashboard = tryCatch(async (req, res) => {
  const [groupCount, userCount, messageCount, totalCount] = await Promise.all([
    Chat.countDocuments({ groupChat: true }),
    User.countDocuments(),
    Message.countDocuments(),
    Chat.countDocuments(),
  ]);

  const today = new Date();
  const last7Days = new Date();

  last7Days.setDate(last7Days.getDate() - 7);

  const last7DaysMessage = await Message.find({
    createdAt: {
      $gte: last7Days,
      $lte: today,
    },
  }).select("createdAt");

  const messages = new Array(7).fill(0);
  last7DaysMessage.forEach((message) => {
    const indexApprox =
      (today.getTime() - message.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const index = Math.floor(indexApprox);
    messages[6 - index]++;
  });

  const stats = {
    groupCount,
    userCount,
    messageCount,
    totalCount,
    messages
  };

  return res.status(200).json({
    success: true,
    stats
  })
});
// 5:25 time
