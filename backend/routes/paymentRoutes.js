import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  getMyPayments,
  getPropertyPayments,
  createCheckoutSession,
  verifySession,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post(
  "/create-checkout-session",
  auth,
  requireRole("tenant"),
  createCheckoutSession
);

router.get("/my", auth, requireRole("tenant"), getMyPayments);
router.get("/verify-session", auth, requireRole("tenant"), verifySession);
router.get("/property", auth, requireRole("owner"), getPropertyPayments);

export default router;