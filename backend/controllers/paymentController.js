import Payment from "../models/Payment.js";
import Property from "../models/Property.js";

// ── GET /api/payments/my ───────────────────────────────────
export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ tenantId: req.user.id })
      .populate("roomId",     "label rent")
      .populate("propertyId", "title city")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: payments.length, payments });
  } catch (err) {
    console.error("getMyPayments error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/payments/property ─────────────────────────────
export const getPropertyPayments = async (req, res) => {
  try {
    const myProperties = await Property.find({ ownerId: req.user.id }).select("_id");
    const propertyIds  = myProperties.map((p) => p._id);

    const payments = await Payment.find({ propertyId: { $in: propertyIds } })
      .populate("tenantId",   "name email")
      .populate("roomId",     "label")
      .populate("propertyId", "title city")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: payments.length, payments });
  } catch (err) {
    console.error("getPropertyPayments error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
