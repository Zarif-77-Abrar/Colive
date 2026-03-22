import express from "express";
import { body } from "express-validator";
import { register, login, getMe } from "../controllers/authController.js";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required.")
    .isLength({ min: 2, max: 60 }).withMessage("Name must be between 2 and 60 characters."),
  body("email").trim().notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please enter a valid email address.").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required.")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number."),
  body("role").optional()
    .isIn(["tenant", "owner"]).withMessage("Role must be either tenant or owner."),
  body("gender").optional()
    .isIn(["male", "female", "other", "prefer_not_to_say"]).withMessage("Invalid gender value."),
  body("phone").optional()
    .isMobilePhone().withMessage("Please enter a valid phone number."),
];

const loginValidation = [
  body("email").trim().notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Please enter a valid email address.").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required."),
];

router.post("/register", registerValidation, register);
router.post("/login",    loginValidation,    login);
router.get("/me",        auth,               getMe);

export default router;
