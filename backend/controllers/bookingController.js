import BookingRequest from "../models/BookingRequest.js";

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
