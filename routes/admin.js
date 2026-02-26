import express from "express";
import {
  allUsers,
  allChats,
  allMessages,
  getDashboard,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/users", allUsers);
router.get("/chats", allChats);
router.get("/messages", allMessages);
router.get("/dashboard", getDashboard);

export default router;