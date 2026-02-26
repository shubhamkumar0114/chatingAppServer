import { tryCatch } from "../middlewears/error.js";
import { User } from "../models/user.model.js";
import { emitEvent, sendToken, uploadFileToCloudinary } from "../utils/featres.js";
import bcrypt from "bcrypt";
import { errHandler } from "../utils/utility.js";
import { Chat } from "../models/chat.model.js";
import { Request } from "../models/request.model.js";
import { NEW_REQUEST, REFETCH_CHAT } from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";

// ----------------new user register--------------
export const userRegister = tryCatch(async (req, res, next) => {

  const { name, username, password, bio } = req.body;
  const file = req.file;
  // console.log(file)
  if(!file) return next(new errHandler("Please upload avatar", 400))

  const avatar = await uploadFileToCloudinary(file)


  const user = await User.create({
    name,
    username,
    password,
    avatar,
    bio,
  });

  sendToken(res, user, 201, "User created");
});

// -------------login user--------------
export const userLogin = tryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  // find user
  const user = await User.findOne({ username }).select("+password");

  if (!user) return next(new errHandler("Inviled Username or Password", 404));

  const isMatchPassword = await bcrypt.compare(password, user.password);

  if (!isMatchPassword)
    return next(new errHandler("Inviled Username or Password", 404));

  sendToken(res, user, 200, `Welcome back ${user.name} login success`);
});

// get my profile
export const profie = tryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);
  res.status(200).json({ message: "User profile", user });
});

// logout user
export const logout = tryCatch(async (req, res, next) => {
  res.status(200).cookie("token", "").json({ message: "User logout" });
});

// search user
export const searchUser = tryCatch(async (req, res, next) => {
  const { name = "" } = req.query;

  const myAllChats = await Chat.find({ members: req.user, groupChat: true });

  const allUserFromMyChat = myAllChats.flatMap((chat) => chat.members);

  const allUserExpectMyFriend = await User.find({
    _id: { $nin: allUserFromMyChat },
    name: { $regex: name, $options: "i" },
  });

  const user = allUserExpectMyFriend.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  res.status(200).json({ message: "Search ", name, user });
});

export const sendRequest = tryCatch(async (req, res, next) => {
  const { userId } = req.body;
  const requestSend = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      {sender: userId, receiver: req.user },
    ],
  });

  if (requestSend) return next(new errHandler("Already request send", 400));

  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId]);
  res.status(200).json({
    success: true,
    message: "Request send",
  });
});

export const acceptRequest = tryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new errHandler("Request not found", 400));

  if (request.receiver._id.toString() !== req.user.toString()) {
    return next(
      new errHandler("You are not authrized to accept this request", 401)
    );
  }

  if (!accept) {
    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Friend Request Accepted",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender._id} - ${request.receiver._id}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHAT, members);
  res.status(200).json({
    success: true,
    message: "Request Accepted",
    senderId: request.sender._id,
  });
});

export const notifications = tryCatch(async (req, res, next) => {
 
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );
  const allRequest = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));
  res.status(200).json({
    success: true,
    message: "Notificatons",
    allRequest,
  });
});

export const myFriends = tryCatch(async (req, res, next) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");
  
    
  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);
    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });
  
  if (chatId) {
    const chat = await Chat.findById(chatId);
     
    const avilableFriend = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );
     
    return res.status(200).json({ success: true, avilableFriend });
  } else {
    return res.status(200).json({ success: true, friends });
  }
});
// 4:30:33
