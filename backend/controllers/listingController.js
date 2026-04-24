import axios from "axios";
import Property from "../models/Property.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import { fetchNearbyAmenities } from "../services/googlePlacesService.js";
import { notifyNewListing } from "../services/notificationService.js";

// ── GET /api/properties/adv-search ──────────────────────────
export const searchProperties = async (req, res) => {
  try {
    const { minRent, maxRent, minPrice, maxPrice, city, radius, bedrooms, furnished } = req.query;

    const filter = {};

    const min = minPrice || minRent;
    const max = maxPrice || maxRent;
    if (min) filter["rentRange.min"] = { $gte: Number(min) };
    if (max) filter["rentRange.max"] = { $lte: Number(max) };
    if (city) filter.city = { $regex: city, $options: "i" };
    if (bedrooms) filter.availableRooms = { $gte: Number(bedrooms) };
    if (furnished === "true") filter.amenities = { $regex: "furnished", $options: "i" };

    let properties = [];
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const hasRealKey = apiKey && apiKey !== "dummy" && apiKey !== "";

    // Geo-spatial search when a real Maps API key exists
    if (city && hasRealKey) {
      try {
        const geocodeRes = await axios.get("https://maps.googleapis.com/maps/api/geocode/json", {
          params: { address: city, key: apiKey },
        });
        if (geocodeRes.data.status === "OK" && geocodeRes.data.results.length > 0) {
          const loc = geocodeRes.data.results[0].geometry.location;
          const maxDistance = radius ? Number(radius) * 1000 : 10000;
          properties = await Property.find({
            ...filter,
            location: {
              $near: {
                $geometry: { type: "Point", coordinates: [loc.lng, loc.lat] },
                $maxDistance: maxDistance,
              },
            },
          }).populate("ownerId", "name phone email").sort({ createdAt: -1 });
        } else {
          properties = await Property.find(filter).populate("ownerId", "name phone email").sort({ createdAt: -1 });
        }
      } catch {
        properties = await Property.find(filter).populate("ownerId", "name phone email").sort({ createdAt: -1 });
      }
    } else {
      properties = await Property.find(filter).populate("ownerId", "name phone email").sort({ createdAt: -1 });
    }

    // Demo fallback if no results
    if (properties.length === 0) {
      const cityLower = (city || "").toLowerCase();
      const cityDefaults = {
        dhaka: { lat: 23.8103, lng: 90.4125, title: "Premium Dhaka Student Studio" },
        chittagong: { lat: 22.3569, lng: 91.7832, title: "Port City Shared Living" },
        sylhet: { lat: 24.8949, lng: 91.8687, title: "Green Sylhet Room-share" },
        khulna: { lat: 22.8456, lng: 89.5403, title: "Khulna Central Hostel" },
      };
      const cd = cityDefaults[cityLower] || { lat: 23.8103, lng: 90.4125, title: "CoLive Demo Property" };

      properties.push({
        _id: "demo_id_001",
        title: cd.title,
        address: `Main Road, ${city || "Dhaka"}`,
        city: city || "Dhaka",
        rentRange: { min: 3000, max: 8000 },
        availableRooms: 1,
        location: { type: "Point", coordinates: [cd.lng, cd.lat] },
        amenities: ["Furnished", "WiFi", "AC"],
      });
    }

    // Attach static map URLs
    const mapKey = hasRealKey ? apiKey : null;
    const propertiesWithMaps = properties.map((p) => {
      const pObj = typeof p.toObject === "function" ? p.toObject() : p;
      if (pObj.location?.coordinates?.length === 2) {
        let [lng, lat] = pObj.location.coordinates;
        if (lat < -180 || lat > 180) [lat, lng] = [lng, lat];
        pObj.staticMapUrl = mapKey
          ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=400x300&markers=color:red%7C${lat},${lng}&key=${mapKey}`
          : `https://placehold.co/400x300/0694a2/white?text=${encodeURIComponent(pObj.city || "Location")}`;
      }
      return pObj;
    });

    return res.status(200).json({ count: propertiesWithMaps.length, properties: propertiesWithMaps });
  } catch (err) {
    console.error("searchProperties error:", err.message);
    return res.status(500).json({ message: "Server error during advanced property search." });
  }
};

// ── GET /api/properties/:id/amenities ────────────────────────
export const getPropertyAmenities = async (req, res) => {
  const { id } = req.params;
  try {
    // Handle demo IDs
    if (id.startsWith("demo")) {
      const data = await fetchNearbyAmenities(23.8103, 90.4125);
      return res.status(200).json(data);
    }

    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: "Property not found." });

    if (!property.location?.coordinates || property.location.coordinates.length < 2) {
      return res.status(200).json({
        safetyScore: "N/A",
        amenities: { hospital: [], police: [], park: [], restaurant: [], school: [] },
      });
    }

    const [lng, lat] = property.location.coordinates;
    const data = await fetchNearbyAmenities(lat, lng);
    return res.status(200).json(data);
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ message: "Invalid Property ID." });
    console.error("getPropertyAmenities error:", err.message);
    return res.status(500).json({ message: "Server error fetching amenities." });
  }
};

// ── GET /api/properties/nearby ────────────────────────────────
export const getNearbyPlaces = async (req, res) => {
  const { lat, lng, radius, keyword } = req.query;

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!lat || !lng || isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({ message: "Valid lat and lng are required." });
  }

  try {
    const data = await fetchNearbyAmenities(parsedLat, parsedLng, Number(radius) || 2000, keyword || "");
    return res.status(200).json(data);
  } catch (err) {
    console.error("getNearbyPlaces error:", err.message);
    return res.status(500).json({ message: "Server error fetching nearby places." });
  }
};

// ── POST /api/auth/fcm-token ──────────────────────────────────
export const registerFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required." });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
    }
    return res.status(200).json({ message: "FCM token registered successfully." });
  } catch (err) {
    console.error("registerFcmToken error:", err.message);
    return res.status(500).json({ message: "Server error registering token." });
  }
};

// ── POST /api/properties (create listing + trigger notification) ──
export const createPropertyListing = async (req, res) => {
  console.log("Create Property Request Body:", JSON.stringify(req.body, null, 2));
  try {
    const { title, description, address, city, location, rentRange, amenities, images } = req.body;

    const property = await Property.create({
      ownerId: req.user.id,
      title, description, address, city, location, rentRange, amenities, images,
    });

    // Precompute safety score if location exists
    if (property.location?.coordinates?.length === 2) {
      try {
        const [lng, lat] = property.location.coordinates;
        const amenityData = await fetchNearbyAmenities(lat, lng);
        property.safetyRating = {
          score: amenityData.safetyScore,
          reviewCount: (amenityData.amenities.police?.length || 0) + (amenityData.amenities.hospital?.length || 0),
        };
        await property.save();
      } catch {
        console.warn("Could not precompute safety score for new listing.");
      }
    }

    // Fire and forget — doesn't block the response
    notifyNewListing(property);

    return res.status(201).json({ message: "Property listed successfully!", property });
  } catch (err) {
    console.error("createPropertyListing error:", err.message);
    return res.status(500).json({ message: "Server error creating property." });
  }
};

// ── GET /api/properties/:id (extended — with rooms) ──────────
export const getPropertyByIdExtended = async (req, res) => {
  const { id } = req.params;

  if (id === "demo_id_001" || id.startsWith("demo")) {
    return res.status(200).json({
      property: {
        _id: id,
        title: "Model CoLive Property",
        address: "77 Student Housing Ave",
        city: "Dhaka",
        rentRange: { min: 5000, max: 15000 },
        availableRooms: 2,
        amenities: ["Free WiFi", "AC", "Laundry", "Kitchen Access"],
        ownerId: { name: "CoLive Support", phone: "+880123456789", email: "support@colive.com" },
        location: { type: "Point", coordinates: [90.4125, 23.8103] },
        rooms: [
          { label: "Room A", rent: 6000, description: "Spacious master bedroom" },
          { label: "Room B", rent: 5500, description: "Cozy quiet room for studying" },
        ],
      },
    });
  }

  try {
    const property = await Property.findById(id).populate("ownerId", "name phone email");
    if (!property) return res.status(404).json({ message: "Property not found." });

    const rooms = await Room.find({ propertyId: property._id }).populate(
      "currentTenants", "name gender university preferences"
    );

    // Generate static map URL for the detail view
    const pObj = property.toObject();
    if (pObj.location?.coordinates?.length === 2) {
      let [lng, lat] = pObj.location.coordinates;
      if (lat < -180 || lat > 180) [lat, lng] = [lng, lat];
      const mapKey = process.env.GOOGLE_MAPS_API_KEY;
      pObj.staticMapUrl = (mapKey && mapKey !== "dummy")
        ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=800x400&markers=color:red%7C${lat},${lng}&key=${mapKey}`
        : `https://placehold.co/800x400/0694a2/white?text=${encodeURIComponent(pObj.city || "Property")}`;
    }

    return res.status(200).json({ property: { ...pObj, rooms } });
  } catch (err) {
    if (err.name === "CastError") return res.status(404).json({ message: "Invalid Property ID format." });
    console.error("getPropertyByIdExtended error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
