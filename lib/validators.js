import { body, check, param, query, validationResult } from "express-validator";
import { errHandler } from "../utils/utility.js";

const validatorHandler = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessage = errors
    .array()
    .map((err) => err.msg)
    .join(", ");

  if (errors.isEmpty()) return next();
  else next(new errHandler(errorMessage));
};

const registerValidator = () => [
  body("name", "Please enter name").notEmpty(),
  body("username", "Please enter username").notEmpty(),
  body("password", "Please enter password").notEmpty(),
  body("bio", "Please enter bio").notEmpty()
];

const loginValidator = () => [
  body("username", "Please enter username").notEmpty(),
  body("password", "Please enter password").notEmpty(),
];
const newGroupValidator = () => [
  body("name", "Please enter name").notEmpty(),
  body("members", "Please enter members").notEmpty(),
];

const addMembersValidator = () => [
  body("chatId", "Please enter chatId").notEmpty(),
  body("members", "Please enter members").notEmpty(),
];

const removeMembersValidator = () => [
  body("chatId", "Please enter chatId").notEmpty(),
  body("userId", "Please enter userId").notEmpty(),
];

const sendAttachmentValidator = () => [
  body("chatId", "Please enter chatId").notEmpty(),

];

const renameGroupValidator = () => [
  param("id", "Please chat id").notEmpty(),
  body("name", "Please enter name").notEmpty(),
];

const leaveGroupValidator = () => [
  param("id", "Please enter chat id").notEmpty(),
];
const deleteChatValidator = () => [
  param("id", "Please enter chat id").notEmpty(),
];

const getMessageValidator = () => [
  param("id", "Please enter chat id").notEmpty(),
];

const getChatsDetailsValidator = () => [
  param("id", "Please enter chat id").notEmpty(),
];
const searchUserValidator = () => [
  query("name", "Please enter search user").notEmpty(),
];

export {
  registerValidator,
  loginValidator,
  validatorHandler,
  newGroupValidator,
  addMembersValidator,
  removeMembersValidator,
  sendAttachmentValidator,
  renameGroupValidator,
  leaveGroupValidator,
  deleteChatValidator,
  getMessageValidator,
  getChatsDetailsValidator,
  searchUserValidator,
};
