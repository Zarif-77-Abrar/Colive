import mongoose from "mongoose";
import GuestLog from "../models/GuestLog.js";
import Property from "../models/Property.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── POST /api/guests ───────────────────────────────────────
// Tenant submits a guest entry log
export const createLog = async (req, res) => {
  const { guestName, relationship, purpose, visitDate, visitTime, propertyId, durationHours } = req.body;

  if (!guestName || !purpose || !visitDate || !visitTime || !propertyId) {
    return res.status(400).json({ message: "Guest name, purpose, visit date, visit time, and property are required." });
  }

  if (!isValidId(propertyId)) {
    return res.status(400).json({ message: "Invalid Property ID. Please select a valid property." });
  }

  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found." });
    }

    const log = await GuestLog.create({
      userId:        req.user.id,
      propertyId,
      guestName:     guestName.trim(),
      relationship:  relationship?.trim() || "",
      purpose:       purpose.trim(),
      visitDate:     new Date(visitDate),
      visitTime:     visitTime.trim(),
      durationHours: durationHours || undefined,
      status:        "pending",
    });

    return res.status(201).json({ message: "Guest entry submitted.", log });
  } catch (err) {
    console.error("createLog error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/guests/my ─────────────────────────────────────
// Tenant sees their own guest logs
export const getMyLogs = async (req, res) => {
  try {
    const logs = await GuestLog.find({ userId: req.user.id })
      .populate("propertyId", "title city")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: logs.length, logs });
  } catch (err) {
    console.error("getMyLogs error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/guests/property ───────────────────────────────
// Owner sees guest logs for their properties only
export const getPropertyLogs = async (req, res) => {
  try {
    const ownerProperties = await Property.find({ ownerId: req.user.id }).select("_id");
    const propertyIds = ownerProperties.map(p => p._id);

    const logs = await GuestLog.find({ propertyId: { $in: propertyIds } })
      .populate("propertyId", "title city")
      .populate("userId",     "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: logs.length, logs });
  } catch (err) {
    console.error("getPropertyLogs error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/guests/all ────────────────────────────────────
// Admin sees all guest logs across the platform
export const getAllLogs = async (req, res) => {
  try {
    const logs = await GuestLog.find({})
      .populate("propertyId", "title city ownerId")
      .populate({
        path:     "propertyId",
        populate: { path: "ownerId", select: "name email" },
      })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: logs.length, logs });
  } catch (err) {
    console.error("getAllLogs error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PATCH /api/guests/:id/status ──────────────────────────
// Owner or Admin updates status: pending / approved / rejected
export const updateLogStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "approved", "rejected"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${allowed.join(", ")}.` });
  }

  try {
    const log = await GuestLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: "Guest log not found." });

    // Owner can only update logs for their own properties
    if (req.user.role === "owner") {
      const property = await Property.findOne({ _id: log.propertyId, ownerId: req.user.id });
      if (!property) return res.status(403).json({ message: "Access denied." });
    }

    log.status   = status;
    log.approved = status === "approved";
    await log.save();

    const updated = await GuestLog.findById(log._id)
      .populate("propertyId", "title city")
      .populate("userId",     "name email");

    return res.status(200).json({ message: "Status updated.", log: updated });
  } catch (err) {
    console.error("updateLogStatus error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};