import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

// ── GET /api/conversations ──────────────────────────────────
// Get all conversations for current user, sorted by latest message
export const getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate("participants", "name email university gender")
      .populate("relatedRoomId", "label rent status")
      .sort({ updatedAt: -1 });

    // Get last message and unread count for each conversation
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({ conversationId: conv._id })
          .populate("senderId", "name")
          .sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          read: false,
          senderId: { $ne: req.user.id },
        });

        return {
          ...conv.toObject(),
          lastMessage,
          unreadCount,
        };
      })
    );

    return res.status(200).json({ count: enriched.length, conversations: enriched });
  } catch (err) {
    console.error("getMyConversations error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/conversations/:id ──────────────────────────────
// Get messages in a conversation (paginated, newest first)
export const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify current user is participant
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    // Get messages
    const skip = (page - 1) * limit;
    const messages = await Message.find({ conversationId: id })
      .populate("senderId", "name email university gender")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ conversationId: id });

    // Mark as read (only for current user)
    await Message.updateMany(
      { conversationId: id, senderId: { $ne: req.user.id }, read: false },
      { read: true }
    );

    return res.status(200).json({
      count: messages.length,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      messages: messages.reverse(), // Reverse to show chronological order (oldest first)
    });
  } catch (err) {
    console.error("getConversation error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── POST /api/conversations/:id/messages ────────────────────
// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Validate content
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty." });
    }

    // Verify current user is participant
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    // Create message
    const message = new Message({
      conversationId: id,
      senderId: req.user.id,
      content: content.trim(),
      read: false,
    });

    await message.save();

    // Populate sender details and return
    await message.populate("senderId", "name email");

    // Update conversation's updatedAt to sort correctly
    await Conversation.findByIdAndUpdate(id, { updatedAt: new Date() });

    return res.status(201).json({ message });
  } catch (err) {
    console.error("sendMessage error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/conversations/:id/read ─────────────────────────
// Mark all messages in conversation as read for current user
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify current user is participant
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    // Mark messages as read
    const result = await Message.updateMany(
      { conversationId: id, senderId: { $ne: req.user.id }, read: false },
      { read: true }
    );

    return res.status(200).json({
      message: "Messages marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("markAsRead error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── POST /api/conversations ─────────────────────────────────
// Create a new conversation (internal use, called when booking accepted)
export const createConversation = async (req, res) => {
  try {
    const { participants, relatedRoomId } = req.body;

    // Validate participants
    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ message: "At least 2 participants are required." });
    }

    // Check if conversation already exists with same participants
    const existing = await Conversation.findOne({
      participants: { $size: participants.length, $all: participants },
      relatedRoomId,
    });

    if (existing) {
      return res.status(200).json({ conversation: existing });
    }

    // Create conversation
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

// ── DELETE /api/conversations/:id ───────────────────────────
// Soft delete - just mark hidden for current user (optional, can be expanded later)
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify current user is participant
    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    // For MVP, we'll just respond with success
    // In future, can add a 'hiddenBy' array to track who hid it
    return res.status(200).json({ message: "Conversation deleted." });
  } catch (err) {
    console.error("deleteConversation error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
