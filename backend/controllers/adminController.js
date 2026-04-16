import bcrypt from "bcrypt";
import { validationResult } from "express-validator";
import User from "../models/User.js";
import Property from "../models/Property.js";
import Room from "../models/Room.js";
import BookingRequest from "../models/BookingRequest.js";
import MaintenanceRequest from "../models/MaintenanceRequest.js";
import Notice from "../models/Notice.js";

// ── POST /api/admin/create-admin ───────────────────────────
export const createAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { name, email, password, phone } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const admin = await User.create({ name, email, passwordHash, role: "admin", phone });
    return res.status(201).json({
      message: "Admin account created successfully.",
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    console.error("createAdmin error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/admin/users ───────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 });
    return res.status(200).json({ count: users.length, users });
  } catch (err) {
    console.error("getAllUsers error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/admin/users/:id/blacklist ─────────────────────
export const blacklistUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be blacklisted." });
    }
    if (user.isBlacklisted) {
      return res.status(400).json({ message: "User is already blacklisted." });
    }

    user.isBlacklisted   = true;
    user.blacklistReason = reason || "Suspended by administrator.";
    user.blacklistedAt   = new Date();
    user.blacklistedBy   = req.user.id;
    await user.save();

    return res.status(200).json({
      message: `${user.name} has been blacklisted.`,
      user: {
        id:              user._id,
        name:            user.name,
        email:           user.email,
        isBlacklisted:   user.isBlacklisted,
        blacklistReason: user.blacklistReason,
        blacklistedAt:   user.blacklistedAt,
      },
    });
  } catch (err) {
    console.error("blacklistUser error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/admin/users/:id/unblacklist ───────────────────
export const unblacklistUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.isBlacklisted) {
      return res.status(400).json({ message: "User is not blacklisted." });
    }

    user.isBlacklisted   = false;
    user.blacklistReason = "";
    user.blacklistedAt   = null;
    user.blacklistedBy   = null;
    await user.save();

    return res.status(200).json({
      message: `${user.name}'s account has been reinstated.`,
      user: { id: user._id, name: user.name, email: user.email, isBlacklisted: false },
    });
  } catch (err) {
    console.error("unblacklistUser error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/admin/stats ───────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const [
      totalUsers, totalTenants, totalOwners,
      totalProperties, totalRooms, availableRooms,
      pendingBookings, openMaintenance, blacklistedUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "tenant" }),
      User.countDocuments({ role: "owner" }),
      Property.countDocuments(),
      Room.countDocuments(),
      Room.countDocuments({ status: "available" }),
      BookingRequest.countDocuments({ status: "pending" }),
      MaintenanceRequest.countDocuments({ status: { $in: ["pending", "in_progress"] } }),
      User.countDocuments({ isBlacklisted: true }),
    ]);

    return res.status(200).json({
      stats: {
        totalUsers, totalTenants, totalOwners,
        totalProperties, totalRooms, availableRooms,
        pendingBookings, openMaintenance, blacklistedUsers,
      },
    });
  } catch (err) {
    console.error("getStats error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/admin/properties ──────────────────────────────
export const adminGetAllProperties = async (req, res) => {
  try {
    const properties = await Property.find({})
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: properties.length, properties });
  } catch (err) {
    console.error("adminGetAllProperties error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/admin/bookings ────────────────────────────────
export const adminGetAllBookings = async (req, res) => {
  try {
    const bookings = await BookingRequest.find({})
      .populate("tenantId",   "name email")
      .populate("ownerId",    "name email")
      .populate("propertyId", "title city")
      .populate("roomId",     "label rent")
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: bookings.length, bookings });
  } catch (err) {
    console.error("adminGetAllBookings error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/admin/maintenance ─────────────────────────────
export const adminGetAllMaintenance = async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({})
      .populate("propertyId", "title city")
      .populate("roomId",     "label")
      .populate("createdBy",  "name email")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: requests.length, requests });
  } catch (err) {
    console.error("adminGetAllMaintenance error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/admin/notices ─────────────────────────────────
export const adminGetAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find({})
      .populate("propertyId", "title city")
      .populate("createdBy",  "name email role")
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: notices.length, notices });
  } catch (err) {
    console.error("adminGetAllNotices error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
