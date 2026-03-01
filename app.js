import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { NEW_MESSAGE, NEW_MESSAGE_ALERT, START_TYPING, STOP_TYPING } from "./constants/event.js";
import { errorMiddleware } from "./middlewears/error.js";
import { connectDb } from "./utils/featres.js";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";

import { getSockets } from "./lib/helper.js";
import adminRouter from "./routes/admin.js";
import chatRouter from "./routes/chat.js";
import userRouter from "./routes/user.js";
import { Message } from "./models/message.model.js";
import { socketAuthenticator } from "./middlewears/authenticated.js";
dotenv.config();

const app = express();

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173","https://chating-app-wine.vercel.app"],
    methods: ["POST", "GET", "DELETE", "PUT"],
    credentials: true,
  },
});

app.set("io", io)

const port =  process.env.PORT || 4001;

// mongodb connection
await connectDb(process.env.MONGO_URI);

// cloudinary config
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

// middlewares
app.use(
  cors({
    origin: ["http://localhost:5173","https://chating-app-wine.vercel.app"],
    methods: ["POST", "GET", "DELETE", "PUT"],
    credentials: true,
  }),
);
// app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: true}))
// api
app.get("/", (req, res) => {
  res.send("hello server");
});

app.use("/api/v1/user", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/admin", adminRouter);

// -----------------socket connection---------------------//

io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAuthenticator(err, socket, next);
  });
});

export const userSocketIds = new Map();

io.on("connection", (socket) => {
  const user = socket.user;
  if(!user) return "Not user login Please login";
  userSocketIds.set(user._id.toString(), socket.id);
  console.log(userSocketIds);

  //-------------NEW-MESSAGE-----------------
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDb = {
      content: message,
      sender: user._id,
      chat: chatId,
    };

    const memberSockets = getSockets(members);
    io.to(memberSockets).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(memberSockets).emit(NEW_MESSAGE_ALERT, { chatId });
    await Message.create(messageForDb);
  });

  // ---------------START-TYPING---------------
  socket.on(START_TYPING , ({members , chatId})=> {
    const socketMembers = getSockets(members);
    socket.to(socketMembers).emit(START_TYPING , {chatId})
  })

  // ---------------STOP-TYPING---------------
  socket.on(STOP_TYPING , ({members , chatId})=> {
    const socketMembers = getSockets(members);
    socket.to(socketMembers).emit(STOP_TYPING , {chatId})
  })

  socket.on("disconnect", (socket) => {
    userSocketIds.delete(user._id.toString());
    console.log("user disconnected");
  });
});
// -----------------socket connection---------------------

app.use(errorMiddleware);

server.listen(port, () => console.log(`server running on ${port}`));
