import express from "express";
import  auth  from "../middleware/auth.js";
import {
  getMyConversations,
  getConversation,
  sendMessage,
  markAsRead,
  createConversation,
  // deleteConversation,
} from "../controllers/conversationController.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

// ── GET /api/conversations ─────────────────────────────────
// Get all conversations for current user
router.get("/", getMyConversations);

// ── POST /api/conversations ────────────────────────────────
// Create a new conversation (internal)
router.post("/", createConversation);

// ── GET /api/conversations/:id ─────────────────────────────
// Get messages in a specific conversation
router.get("/:id", getConversation);

// ── POST /api/conversations/:id/messages ───────────────────
// Send a message in a conversation
router.post("/:id/messages", sendMessage);

// ── PUT /api/conversations/:id/read ────────────────────────
// Mark all messages as read
router.put("/:id/read", markAsRead);

// ── DELETE /api/conversations/:id ──────────────────────────
// Delete (hide) a conversation
// router.delete("/:id", deleteConversation);

export default router;
