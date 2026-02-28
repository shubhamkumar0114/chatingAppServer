import { User } from "../models/user.model.js";
import { errHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";

export const isAuth = async (req, res, next) => {
  const token = req.cookies["token"];
  console.log(token)
  if (!token) return next(new errHandler("Please login", 401));

  // verify token
  const decodedUser = await jwt.verify(token, process.env.SECRET_PASSWORD);
  req.user = decodedUser._id;

  if (req.user) {
    next();
  }
};

export const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(new errHandler("Please login", 401));

    const authToken = socket.request.cookies["token"];

    const decoded = jwt.verify(authToken, process.env.SECRET_PASSWORD);
    socket.user = await User.findById(decoded._id);
    return next();
  } catch (error) {
    console.log(err);
  }
};
