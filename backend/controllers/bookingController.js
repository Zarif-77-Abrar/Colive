import BookingRequest from "../models/BookingRequest.js";
import Room from "../models/Room.js";
import Conversation from "../models/Conversation.js";
import { syncRoomStatus } from "../utils/syncRoomStatus.js";

// ── GET /api/bookings/my ───────────────────────────────────
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await BookingRequest.find({ tenantId: req.user.id })
      .populate("roomId",     "label rent")
      .populate("propertyId", "title city address")
      .populate("ownerId",    "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: bookings.length, bookings });
  } catch (err) {
    console.error("getMyBookings error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/bookings/received ─────────────────────────────
export const getReceivedBookings = async (req, res) => {
  try {
    const bookings = await BookingRequest.find({ ownerId: req.user.id })
      .populate("roomId",     "label rent")
      .populate("propertyId", "title city")
      .populate("tenantId",   "name email gender university preferences")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: bookings.length, bookings });
  } catch (err) {
    console.error("getReceivedBookings error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── POST /api/bookings ─────────────────────────────────────
export const createBooking = async (req, res) => {
  try {
    const { roomId, propertyId, ownerId, message, compatibilityScore } = req.body;

    if (!roomId || !propertyId || !ownerId) {
      return res.status(400).json({ message: "roomId, propertyId and ownerId are required." });
    }

    // Check room exists and has space
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found." });
    if (room.status === "occupied") {
      return res.status(400).json({ message: "This room is fully occupied." });
    }

    // Prevent duplicate pending request
    const existing = await BookingRequest.findOne({
      roomId,
      tenantId: req.user.id,
      status: "pending",
    });
    if (existing) {
      return res.status(409).json({ message: "You already have a pending request for this room." });
    }

    // Prevent tenant from booking a room they already live in
    if (room.currentTenants.map(t => t.toString()).includes(req.user.id)) {
      return res.status(400).json({ message: "You are already a tenant in this room." });
    }

    const booking = await BookingRequest.create({
      roomId,
      propertyId,
      tenantId:           req.user.id,
      ownerId,
      message:            message ?? "",
      compatibilityScore: compatibilityScore ?? null,
      status:             "pending",
    });

    return res.status(201).json({
      message: "Booking request sent successfully.",
      booking,
    });
  } catch (err) {
    console.error("createBooking error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/bookings/:id/accept ───────────────────────────
export const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await BookingRequest.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized." });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Only pending bookings can be accepted." });
    }

    // Check room still has space
    const room = await Room.findById(booking.roomId);
    if (!room) return res.status(404).json({ message: "Room not found." });
    if (room.currentTenants.length >= room.capacity) {
      return res.status(400).json({ message: "Room is now fully occupied." });
    }

    // Add tenant to room and sync status
    room.currentTenants.push(booking.tenantId);
    await room.save();
    await syncRoomStatus(room);

    // Update booking
    booking.status     = "accepted";
    booking.resolvedAt = new Date();
    await booking.save();

    // Auto-create conversation if one doesn't exist
    try {
      const existing = await Conversation.findOne({
        participants:  { $all: [booking.tenantId, booking.ownerId] },
        relatedRoomId: booking.roomId,
      });
      if (!existing) {
        await Conversation.create({
          participants:  [booking.tenantId, booking.ownerId],
          relatedRoomId: booking.roomId,
        });
      }
    } catch (convErr) {
      console.error("Failed to create conversation:", convErr.message);
    }

    await booking.populate(["roomId", "tenantId", "ownerId"]);

    return res.status(200).json({
      booking,
      message: "Booking accepted. Tenant added to room.",
    });
  } catch (err) {
    console.error("acceptBooking error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/bookings/:id/reject ───────────────────────────
export const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await BookingRequest.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized." });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Only pending bookings can be rejected." });
    }

    booking.status     = "rejected";
    booking.resolvedAt = new Date();
    await booking.save();

    await booking.populate(["roomId", "tenantId", "ownerId"]);

    return res.status(200).json({ booking, message: "Booking rejected." });
  } catch (err) {
    console.error("rejectBooking error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
