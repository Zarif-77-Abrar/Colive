import Property from "../models/Property.js";
import Room from "../models/Room.js";

// ── GET /api/properties/my ─────────────────────────────────
export const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ ownerId: req.user.id })
      .sort({ createdAt: -1 });

    const result = await Promise.all(
      properties.map(async (p) => {
        const rooms = await Room.find({ propertyId: p._id });
        return { ...p.toObject(), rooms };
      })
    );

    return res.status(200).json({ count: result.length, properties: result });
  } catch (err) {
    console.error("getMyProperties error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/properties ────────────────────────────────────
export const getAllProperties = async (req, res) => {
  try {
    const { city, minRent, maxRent } = req.query;
    const filter = {};
    if (city)    filter.city = { $regex: city, $options: "i" };
    if (minRent) filter["rentRange.min"] = { $gte: Number(minRent) };
    if (maxRent) filter["rentRange.max"] = { $lte: Number(maxRent) };

    const properties = await Property.find(filter)
      .populate("ownerId", "name phone email")
      .sort({ createdAt: -1 });

    const result = await Promise.all(
      properties.map(async (p) => {
        const rooms = await Room.find({ propertyId: p._id });
        return { ...p.toObject(), rooms };
      })
    );

    return res.status(200).json({ count: result.length, properties: result });
  } catch (err) {
    console.error("getAllProperties error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/properties/:id ────────────────────────────────
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate("ownerId", "name phone email");

    if (!property) {
      return res.status(404).json({ message: "Property not found." });
    }

    const rooms = await Room.find({ propertyId: property._id })
      .populate("currentTenants", "name gender university preferences");

    return res.status(200).json({ property: { ...property.toObject(), rooms } });
  } catch (err) {
    console.error("getPropertyById error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
