import mongoose from "mongoose";
import MaintenanceRequest from "../models/MaintenanceRequest.js";
import Property from "../models/Property.js";

// ── Helper: check valid ObjectId ───────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── POST /api/maintenance ──────────────────────────────────
export const createRequest = async (req, res) => {
  const { title, description, category, propertyId, roomLabel, priority } = req.body;

  if (!title || !description || !propertyId) {
    return res.status(400).json({ message: "Title, description, and Property ID are required." });
  }

  if (!isValidId(propertyId)) {
    return res.status(400).json({ message: "Invalid Property ID. Please select a valid property." });
  }

  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found. Please check the Property ID." });
    }

    const request = await MaintenanceRequest.create({
      title,
      description,
      category:   category  || "other",
      priority:   priority  || "medium",
      propertyId,
      roomLabel:  roomLabel?.trim() || "",
      createdBy:  req.user.id,
      status:     "pending",
    });

    return res.status(201).json({ message: "Maintenance request submitted.", request });
  } catch (err) {
    console.error("createRequest error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/maintenance/my ────────────────────────────────
export const getMyRequests = async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({ createdBy: req.user.id })
      .populate("propertyId", "title city address")
      .populate("roomId",     "label")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: requests.length, requests });
  } catch (err) {
    console.error("getMyRequests error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/maintenance/property ─────────────────────────
export const getPropertyRequests = async (req, res) => {
  try {
    const ownerProperties = await Property.find({ ownerId: req.user.id }).select("_id");
    const propertyIds = ownerProperties.map((p) => p._id);

    const requests = await MaintenanceRequest.find({ propertyId: { $in: propertyIds } })
      .populate("propertyId", "title city")
      .populate("roomId",     "label")
      .populate("createdBy",  "name email phone")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: requests.length, requests });
  } catch (err) {
    console.error("getPropertyRequests error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/maintenance/all ───────────────────────────────
export const getAllRequests = async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({})
      .populate("propertyId", "title city")
      .populate("roomId",     "label")
      .populate("createdBy",  "name email")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: requests.length, requests });
  } catch (err) {
    console.error("getAllRequests error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PATCH /api/maintenance/:id/status ─────────────────────
export const updateStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "in_progress", "resolved"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${allowed.join(", ")}.` });
  }

  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });

    if (req.user.role === "owner") {
      const property = await Property.findOne({ _id: request.propertyId, ownerId: req.user.id });
      if (!property) return res.status(403).json({ message: "Access denied." });
    }

    request.status = status;
    if (status === "resolved") request.resolvedAt = new Date();
    await request.save();

    const updated = await MaintenanceRequest.findById(request._id)
      .populate("propertyId", "title city")
      .populate("roomId",     "label")
      .populate("createdBy",  "name email")
      .populate("assignedTo", "name");

    return res.status(200).json({ message: "Status updated.", request: updated });
  } catch (err) {
    console.error("updateStatus error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PATCH /api/maintenance/:id/assign ─────────────────────
export const assignTechnician = async (req, res) => {
  const { technicianName } = req.body;

  if (!technicianName || !technicianName.trim()) {
    return res.status(400).json({ message: "Technician name is required." });
  }

  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });

    if (req.user.role === "owner") {
      const property = await Property.findOne({ _id: request.propertyId, ownerId: req.user.id });
      if (!property) return res.status(403).json({ message: "Access denied." });
    }

    request.technicianName = technicianName.trim();
    request.status = "in_progress";
    await request.save();

    const updated = await MaintenanceRequest.findById(request._id)
      .populate("propertyId", "title city")
      .populate("roomId",     "label")
      .populate("createdBy",  "name email")
      .populate("assignedTo", "name");

    return res.status(200).json({ message: "Technician assigned.", request: updated });
  } catch (err) {
    console.error("assignTechnician error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};