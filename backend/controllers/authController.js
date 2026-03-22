import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import User from "../models/User.js";

// ── Helper: generate JWT ───────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// ── Helper: send validation errors ────────────────────────
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
};

// ── POST /api/auth/register ────────────────────────────────
export const register = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const { name, email, password, role, gender, university, phone } = req.body;

  try {
    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // Prevent registering as admin through the public API
    if (role === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be created through registration." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || "tenant",
      gender,
      university,
      phone,
    });

    const token = generateToken(user);

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        university: user.university,
      },
    });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/auth/login ───────────────────────────────────
export const login = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  const { email, password } = req.body;

  try {
    // Find user — include passwordHash (excluded by default via select)
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      // Intentionally vague — don't reveal whether email exists
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Update FCM token if provided
    if (req.body.fcmToken && !user.fcmTokens.includes(req.body.fcmToken)) {
      user.fcmTokens.push(req.body.fcmToken);
      await user.save();
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id:         user._id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        university: user.university,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/auth/me ───────────────────────────────────────
// Returns the currently logged-in user's profile.
// Protected — requires auth middleware.
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({ user });
  } catch (err) {
    console.error("GetMe error:", err.message);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};
