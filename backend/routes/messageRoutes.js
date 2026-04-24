import express from "express";
import auth from "../middleware/auth.js";
import { sendMessage, getReceivedMessages } from "../controllers/messageController.js";

const router = express.Router();

router.post("/", auth, sendMessage);
router.get("/received", auth, getReceivedMessages);

export default router;
