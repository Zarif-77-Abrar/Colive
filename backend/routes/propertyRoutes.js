import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  getAllProperties,
  getPropertyById,
  getMyProperties,
} from "../controllers/propertyController.js";

const router = express.Router();

// Public routes
router.get("/", getAllProperties);

// Owner route
router.get("/my", auth, requireRole("owner"), getMyProperties);

// Public single property route
router.get("/:id", getPropertyById);

export default router;