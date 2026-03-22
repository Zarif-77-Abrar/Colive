import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  getAllProperties,
  getMyProperties,
  getPropertyById,
} from "../controllers/propertyController.js";

const router = express.Router();

// NOTE: /my must come before /:id to avoid Express
// matching the string "my" as a MongoDB ObjectId
router.get("/my",  auth, requireRole("owner"), getMyProperties);
router.get("/",    getAllProperties);
router.get("/:id", getPropertyById);

export default router;
