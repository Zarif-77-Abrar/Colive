import MaintenanceRequest from "../models/MaintenanceRequest.js";
import Property from "../models/Property.js";

// ── GET /api/maintenance/my ────────────────────────────────
export const getMyRequests = async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({ createdBy: req.user.id })
      .populate("propertyId", "title city")
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
    const myProperties = await Property.find({ ownerId: req.user.id }).select("_id");
    const propertyIds  = myProperties.map((p) => p._id);

    const requests = await MaintenanceRequest.find({ propertyId: { $in: propertyIds } })
      .populate("propertyId", "title city")
      .populate("roomId",     "label")
      .populate("createdBy",  "name email")
      .populate("assignedTo", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: requests.length, requests });
  } catch (err) {
    console.error("getPropertyRequests error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
