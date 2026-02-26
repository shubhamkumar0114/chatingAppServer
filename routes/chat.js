import express from "express";
import { isAuth } from "../middlewears/authenticated.js";
import {
  addMembers,
  deleteChat,
  getChatsDetails,
  getMessage,
  getMyChat,
  getMyGroups,
  leaveGroups,
  newGroupChat,
  removeMembers,
  renameGroup,
  sendAttachment,
} from "../controllers/chat.js";
import { attachment } from "../middlewears/multer.js";
import {
  addMembersValidator,
  deleteChatValidator,
  getChatsDetailsValidator,
  getMessageValidator,
  leaveGroupValidator,
  newGroupValidator,
  removeMembersValidator,
  renameGroupValidator,
  sendAttachmentValidator,
  validatorHandler,
} from "../lib/validators.js";

const router = express.Router();

router.use(isAuth);
router.post("/new", newGroupValidator(), validatorHandler, newGroupChat);
router.get("/my", getMyChat);
router.get("/mygroup", getMyGroups);
router.put("/addmembers", addMembersValidator(), validatorHandler, addMembers);
router.put(
  "/removemembers",
  removeMembersValidator(),
  validatorHandler,
  removeMembers
);
router.delete(
  "/leavegroup/:id",
  leaveGroupValidator(),
  validatorHandler,
  leaveGroups
);
router.post(
  "/message",
  attachment,
  sendAttachmentValidator(),
  validatorHandler,
  sendAttachment
);
router.get("/message/:id", getMessageValidator(), validatorHandler, getMessage);

router
  .route("/:id")
  .get(getChatsDetailsValidator(), validatorHandler, getChatsDetails)
  .put(renameGroupValidator(), validatorHandler, renameGroup)
  .delete(deleteChatValidator(), validatorHandler, deleteChat);


export default router;
