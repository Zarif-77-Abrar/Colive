import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  getMyPayments,
  getPropertyPayments,
} from "../controllers/paymentController.js";

const router = express.Router();

router.get("/my",       auth, requireRole("tenant"), getMyPayments);
router.get("/property", auth, requireRole("owner"),  getPropertyPayments);

export default router;
