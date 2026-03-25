import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  getMyBookings,
  getReceivedBookings,
  acceptBooking,
  rejectBooking,
} from "../controllers/bookingController.js";

const router = express.Router();

router.get("/my",       auth, requireRole("tenant"), getMyBookings);
router.get("/received", auth, requireRole("owner"),  getReceivedBookings);
router.put("/:id/accept", auth, requireRole("owner"), acceptBooking);
router.put("/:id/reject", auth, requireRole("owner"), rejectBooking);

export default router;
