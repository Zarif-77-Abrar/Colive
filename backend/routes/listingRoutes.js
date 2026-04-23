import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  searchProperties,
  getPropertyAmenities,
  getNearbyPlaces,
  registerFcmToken,
  createPropertyListing,
  getPropertyByIdExtended,
} from "../controllers/listingController.js";

const router = express.Router();

// Advanced property search with filters + Google Maps geocoding
router.get("/adv-search", searchProperties);

// Get nearby places by lat/lng
router.get("/nearby", getNearbyPlaces);

// Get neighborhood safety & amenities for a property
// Note: this pattern covers /api/listing/:id/amenities
router.get("/:id/amenities", getPropertyAmenities);

// Get full property details (with rooms, map, etc.)
router.get("/:id", getPropertyByIdExtended);

// Create a new property listing (triggers FCM push alerts)
router.post("/", auth, requireRole("owner"), createPropertyListing);

export default router;
