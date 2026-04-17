import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  generateAgreement,
  getMyAgreements,
  getPropertyAgreements,
} from "../controllers/agreementController.js";

const router = express.Router();

// Tenant or Owner — generate/download PDF (no role restriction, controller checks)
router.post("/generate/:bookingId", auth, generateAgreement);

// Tenant
router.get("/my",       auth, requireRole("tenant"), getMyAgreements);

// Owner
router.get("/property", auth, requireRole("owner"),  getPropertyAgreements);

export default router;
