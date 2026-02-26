import express from "express";
import {
  acceptRequest,
  logout,
  myFriends,
  notifications,
  profie,
  searchUser,
  sendRequest,
  userLogin,
  userRegister,
} from "../controllers/user.js";
import {
  loginValidator,
  registerValidator,
  validatorHandler
} from "../lib/validators.js";
import { isAuth } from "../middlewears/authenticated.js";
import { singleAvatar } from "../middlewears/multer.js";

const router = express.Router();

router.post(
  "/register",
  singleAvatar,
  registerValidator(),
  validatorHandler,
  userRegister
);
router.post("/login", loginValidator(), validatorHandler, userLogin);
router.get("/logout", logout);

router.get("/me", isAuth, profie);
router.get("/search", isAuth, searchUser);
router.put("/sendrequest", isAuth, sendRequest);
router.put("/acceptrequest", isAuth, acceptRequest);
router.get("/notifications", isAuth, notifications);
router.get("/friends", isAuth, myFriends);

export default router;
