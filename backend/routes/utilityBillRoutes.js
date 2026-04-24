import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  createOrUpdateBill,
  getMyBillSplits,
  getPropertyBills,
  markSplitPaid,
} from "../controllers/utilityBillController.js";

const router = express.Router();

// Owner
router.post("/",              auth, requireRole("owner"),  createOrUpdateBill);
router.get("/property",       auth, requireRole("owner"),  getPropertyBills);

// Tenant
router.get("/my",             auth, requireRole("tenant"), getMyBillSplits);
router.patch("/splits/:id/pay", auth, requireRole("tenant"), markSplitPaid);

export default router;
