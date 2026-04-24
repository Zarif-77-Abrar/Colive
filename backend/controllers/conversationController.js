import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { sendNotification } from "../utils/sendNotification.js";

// ── GET /api/conversations ─────────────────────────────────
export const getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate("participants", "name email university gender")
      .populate("relatedRoomId", "label rent status")
      .sort({ updatedAt: -1 });

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({ conversationId: conv._id })
          .populate("senderId", "name")
          .sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          read:           false,
          senderId:       { $ne: req.user.id },
        });

        return { ...conv.toObject(), lastMessage, unreadCount };
      })
    );

    return res.status(200).json({ count: enriched.length, conversations: enriched });
  } catch (err) {
    console.error("getMyConversations error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/conversations/:id ─────────────────────────────
export const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const skip = (page - 1) * limit;
    const messages = await Message.find({ conversationId: id })
      .populate("senderId", "name email university gender")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ conversationId: id });

    await Message.updateMany(
      { conversationId: id, senderId: { $ne: req.user.id }, read: false },
      { read: true }
    );

    return res.status(200).json({
      count:    messages.length,
      total,
      page:     parseInt(page),
      limit:    parseInt(limit),
      messages: messages.reverse(),
    });
  } catch (err) {
    console.error("getConversation error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── POST /api/conversations/:id/messages ───────────────────
export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty." });
    }

    const conversation = await Conversation.findById(id)
      .populate("participants", "name fcmTokens");

    if (!conversation || !conversation.participants.find(p => p._id.toString() === req.user.id)) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const message = new Message({
      conversationId: id,
      senderId:       req.user.id,
      content:        content.trim(),
      read:           false,
    });
    await message.save();
    await message.populate("senderId", "name email");

    await Conversation.findByIdAndUpdate(id, { updatedAt: new Date() });

    // ── Send push notification to other participants ────────
    const sender = conversation.participants.find(
      p => p._id.toString() === req.user.id
    );
    const recipients = conversation.participants.filter(
      p => p._id.toString() !== req.user.id
    );
    const tokens = recipients.flatMap(p => p.fcmTokens ?? []);

    if (tokens.length > 0) {
      await sendNotification({
        tokens,
        title: `New message from ${sender?.name ?? "Someone"}`,
        body:  content.trim().length > 80
          ? content.trim().slice(0, 80) + "..."
          : content.trim(),
        data: { conversationId: id },
      });
    }

    return res.status(201).json({ message });
  } catch (err) {
    console.error("sendMessage error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/conversations/:id/read ────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    const result = await Message.updateMany(
      { conversationId: id, senderId: { $ne: req.user.id }, read: false },
      { read: true }
    );

    return res.status(200).json({
      message:       "Messages marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("markAsRead error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── POST /api/conversations ────────────────────────────────
export const createConversation = async (req, res) => {
  try {
    const { participants, relatedRoomId } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ message: "At least 2 participants are required." });
    }

    const existing = await Conversation.findOne({
      participants:  { $size: participants.length, $all: participants },
      relatedRoomId: relatedRoomId ?? null,
    });

    if (existing) {
      return res.status(200).json({ conversation: existing });
    }

    const conversation = new Conversation({
      participants,
      relatedRoomId: relatedRoomId || null,
    });
    await conversation.save();
    await conversation.populate("participants", "name email");

    return res.status(201).json({ conversation });
  } catch (err) {
    console.error("createConversation error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
