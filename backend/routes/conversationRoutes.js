import express from "express";
import auth from "../middleware/auth.js";
import checkBlacklist from "../middleware/checkBlacklist.js";
import {
  getMyConversations, getConversation,
  sendMessage, markAsRead, createConversation,
} from "../controllers/conversationController.js";

const router = express.Router();

router.use(auth);

router.get("/",                  getMyConversations);
router.post("/",                 checkBlacklist, createConversation);
router.get("/:id",               getConversation);
router.post("/:id/messages",     checkBlacklist, sendMessage);
router.put("/:id/read",          markAsRead);

export default router;
