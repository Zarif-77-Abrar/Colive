import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  getMyBookings,
  getReceivedBookings,
} from "../controllers/bookingController.js";

const router = express.Router();

router.get("/my",       auth, requireRole("tenant"), getMyBookings);
router.get("/received", auth, requireRole("owner"),  getReceivedBookings);

export default router;
