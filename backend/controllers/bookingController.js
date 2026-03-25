import BookingRequest from "../models/BookingRequest.js";
import Conversation from "../models/Conversation.js";

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

// ── PUT /api/bookings/:id/accept ────────────────────────────
// Accept a booking request (owner only)
export const acceptBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await BookingRequest.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized." });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Only pending bookings can be accepted." });
    }

    // Update booking status
    booking.status = "accepted";
    booking.resolvedAt = new Date();
    await booking.save();

    // Auto-create conversation with tenant and owner
    try {
      const conversation = new Conversation({
        participants: [booking.tenantId, booking.ownerId],
        relatedRoomId: booking.roomId,
      });
      await conversation.save();
    } catch (convErr) {
      console.error("Failed to create conversation:", convErr.message);
      // Don't fail the booking acceptance if conversation creation fails
    }

    await booking.populate("roomId").populate("tenantId").populate("ownerId");

    return res.status(200).json({ booking, message: "Booking accepted. Conversation created." });
  } catch (err) {
    console.error("acceptBooking error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/bookings/:id/reject ────────────────────────────
// Reject a booking request (owner only)
export const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await BookingRequest.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized." });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Only pending bookings can be rejected." });
    }

    booking.status = "rejected";
    booking.resolvedAt = new Date();
    await booking.save();

    await booking.populate("roomId").populate("tenantId").populate("ownerId");

    return res.status(200).json({ booking, message: "Booking rejected." });
  } catch (err) {
    console.error("rejectBooking error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
