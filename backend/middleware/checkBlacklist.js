import User from "../models/User.js";

// ── checkBlacklist ─────────────────────────────────────────
// Use after auth middleware on any route that should be
// blocked for blacklisted users.
//
// Usage:
//   router.post("/", auth, checkBlacklist, controller);

const checkBlacklist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("isBlacklisted blacklistReason");
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.isBlacklisted) {
      return res.status(403).json({
        code:    "BLACKLISTED",
        message: "Your account has been suspended by an administrator.",
        reason:  user.blacklistReason || "No reason provided.",
      });
    }

    next();
  } catch (err) {
    console.error("checkBlacklist error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

export default checkBlacklist;
