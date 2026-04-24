import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import { getMyNotices, createNotice, getTenantNotices, getAllNotices } from "../controllers/noticeController.js";

const router = express.Router();

router.post("/", auth, createNotice);
router.get("/my", auth, requireRole("owner"), getMyNotices);
router.get("/tenant", auth, requireRole("tenant"), getTenantNotices);
router.get("/all", auth, requireRole("admin"), getAllNotices);

export default router;