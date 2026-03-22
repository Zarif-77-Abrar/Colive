import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import { getMyNotices } from "../controllers/noticeController.js";

const router = express.Router();

router.get("/my", auth, requireRole("owner"), getMyNotices);

export default router;
