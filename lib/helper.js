import { userSocketIds } from "../app.js";

export const getOtherMember = (member, userId) => {
  return member.find((member) => member._id.toString() !== userId.toString());
};

export const getSockets = (users = []) => {
  return users.map((user) => userSocketIds.get(user.toString()));
};

export const getBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
}