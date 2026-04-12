import Property from "../models/Property.js";

// GET /api/properties
export const getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 });

    res.status(200).json({
      count: properties.length,
      properties,
    });
  } catch (err) {
    console.error("getAllProperties error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/properties/:id
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: "Property not found." });
    }

    res.status(200).json(property);
  } catch (err) {
    console.error("getPropertyById error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/properties/my
export const getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ ownerId: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      count: properties.length,
      properties,
    });
  } catch (err) {
    console.error("getMyProperties error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};