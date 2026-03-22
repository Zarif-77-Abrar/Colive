import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import dns from "dns";
import User from "./models/User.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // ── Check if an admin already exists ──────────────────
    const existing = await User.findOne({ role: "admin" });
    if (existing) {
      console.log("⚠️  An admin account already exists:");
      console.log(`   Email : ${existing.email}`);
      console.log(`   Name  : ${existing.name}`);
      console.log("\nNo changes made. Exiting.");
      process.exit(0);
    }

    // ── Admin credentials — change these before running ───
    const ADMIN_NAME     = "SuperAdmin";
    const ADMIN_EMAIL    = "superadmin@colive.com";
    const ADMIN_PASSWORD = "Admin1234";        // ← change this

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

    const admin = await User.create({
      name:         ADMIN_NAME,
      email:        ADMIN_EMAIL,
      passwordHash,
      role:         "admin",
      gender:       "prefer_not_to_say",
    });

    console.log("✅ Initial admin created successfully:");
    console.log(`   ID    : ${admin._id}`);
    console.log(`   Name  : ${admin.name}`);
    console.log(`   Email : ${admin.email}`);
    console.log(`   Role  : ${admin.role}`);
    console.log("\n⚠️  Remember to change the password after first login.");

  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

seedAdmin();
