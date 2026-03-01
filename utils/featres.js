import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from 'cloudinary'
import { v4 as uuid } from "uuid"
import { getBase64, getSockets } from "../lib/helper.js";

const cookieOption = {
  maxAge: 15 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: true,
  sameSite: "none",
};

export const connectDb = async (url) => {
  await mongoose
    .connect(url)
    .then((data) => console.log("connect databases"))
    .catch((err) => {
      throw err;
    });
};

export const sendToken = async (res, user, statusCode, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.SECRET_PASSWORD , {expiresIn: "1d"});
  res.status(statusCode).cookie("token", token, cookieOption).json({
    success: true,
    message,
  });
};

export const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io")
  const usersSockets = getSockets(users);
  io.to(usersSockets).emit(event , data)
  console.log("event emit")
}

export const uploadFileToCloudinary = async (file) => {
  const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(base64, {
    resource_type: "auto",
    public_id: uuid(),
  });
  return {
    public_id: result.public_id,
    url: result.secure_url,
  };
}


export const deleteFileFromCloudinary = async (public_ids) => {

}

