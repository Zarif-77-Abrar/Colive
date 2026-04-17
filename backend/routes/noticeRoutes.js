import express from "express";
import auth, { requireRole } from "../middleware/auth.js";
import { createNotice, getMyNotices, getAllNotices, getTenantNotices, markAsRead, markAllAsRead } from "../controllers/noticeController.js";

const router = express.Router();

router.post("/", auth, createNotice);
router.get("/my", auth, requireRole("owner"), getMyNotices);
router.get("/all", auth, requireRole("admin"), getAllNotices);
router.get("/tenant", auth, requireRole("tenant"), getTenantNotices);
router.patch("/read-all", auth, requireRole("tenant"), markAllAsRead);
router.patch("/:id/read", auth, requireRole("tenant"), markAsRead);

export default router;