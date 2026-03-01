import { User } from "../models/user.model.js";
import { errHandler } from "../utils/utility.js";
import jwt from "jsonwebtoken";

export const isAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.cookies["token"];

    if (!token || token === "null" || token === "undefined")
      return next(new errHandler("Please login again", 401));

    // verify token
    const decodedUser = jwt.verify(token, process.env.SECRET_PASSWORD);
    req.user = decodedUser._id;

    if (req.user) {
      next();
    }
  } catch (error) {
    return next(new errHandler("Invalid or expired token, please login again", 401));
  }
};

export const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const authToken = socket.handshake.auth.token || socket.request.cookies["token"];
    if (!authToken || authToken === "null" || authToken === "undefined")
      return next(new errHandler("Please login", 401));

    const decoded = jwt.verify(authToken, process.env.SECRET_PASSWORD);
    socket.user = await User.findById(decoded._id);
    return next();
  } catch (error) {
    return next(new errHandler("Please login", 401));
  }
};
