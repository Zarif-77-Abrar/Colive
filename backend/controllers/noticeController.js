import Notice from "../models/Notice.js";
import Property from "../models/Property.js";

// ── GET /api/notices/my ────────────────────────────────────
export const getMyNotices = async (req, res) => {
  try {
    const myProperties = await Property.find({ ownerId: req.user.id }).select("_id");
    const propertyIds  = myProperties.map((p) => p._id);

    const notices = await Notice.find({ propertyId: { $in: propertyIds } })
      .populate("propertyId", "title")
      .populate("createdBy",  "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: notices.length, notices });
  } catch (err) {
    console.error("getMyNotices error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
