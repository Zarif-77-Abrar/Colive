import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

// POST /api/messages
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;
    
    if (!receiverId || !content) {
      return res.status(400).json({ message: "receiverId and content are required." });
    }

    // Find or create conversation between sender and receiver
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({ participants: [senderId, receiverId] });
    }

    const newMessage = await Message.create({
      conversationId: conversation._id,
      senderId,
      content,
      read: false
    });

    return res.status(201).json(newMessage);
  } catch (err) {
    console.error("sendMessage error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/messages/received
export const getReceivedMessages = async (req, res) => {
  try {
    // 1. Get all conversations the user is a part of
    const conversations = await Conversation.find({
      participants: req.user.id
    });
    
    const convIds = conversations.map(c => c._id);
    
    // 2. Get messages where the sender is NOT the current user (so they are "received" by the current user)
    const messages = await Message.find({
      conversationId: { $in: convIds },
      senderId: { $ne: req.user.id }
    })
    .populate("senderId", "name email")
    .sort({ createdAt: -1 });

    res.status(200).json({ messages });
  } catch (err) {
    console.error("getReceivedMessages error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
