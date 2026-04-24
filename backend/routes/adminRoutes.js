import express from "express";
import { body } from "express-validator";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  createAdmin, getAllUsers, getStats,
  adminGetAllProperties, adminGetAllBookings,
  adminGetAllMaintenance, adminGetAllNotices,
  blacklistUser, unblacklistUser,
} from "../controllers/adminController.js";

const router = express.Router();
const adminGuard = [auth, requireRole("admin")];

const createAdminValidation = [
  body("name").trim().notEmpty().withMessage("Name is required.")
    .isLength({ min: 2, max: 60 }).withMessage("Name must be between 2 and 60 characters."),
  body("email").trim().notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please enter a valid email.").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required.")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number."),
];

router.post("/create-admin",          ...adminGuard, createAdminValidation, createAdmin);
router.get("/users",                  ...adminGuard, getAllUsers);
router.get("/stats",                  ...adminGuard, getStats);
router.get("/properties",             ...adminGuard, adminGetAllProperties);
router.get("/bookings",               ...adminGuard, adminGetAllBookings);
router.get("/maintenance",            ...adminGuard, adminGetAllMaintenance);
router.get("/notices",                ...adminGuard, adminGetAllNotices);
router.put("/users/:id/blacklist",    ...adminGuard, blacklistUser);
router.put("/users/:id/unblacklist",  ...adminGuard, unblacklistUser);

export default router;
