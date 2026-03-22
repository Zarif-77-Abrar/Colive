import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

import User from "./models/User.js";
import Property from "./models/Property.js";
import Room from "./models/Room.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

const run = async () => {
  try {
    // ── 1. Connect ───────────────────────────────────────────────
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected\n");

    // ── 2. Clean up any leftover test data from previous runs ────
    await User.deleteMany({ email: /testuser@colive/ });
    await Property.deleteMany({ title: "CoLive Test Property" });
    console.log("🧹 Previous test data cleared\n");

    // ── 3. Create a test User (Owner) ────────────────────────────
    const owner = await User.create({
      name: "Test Owner",
      email: "testuser@colive.owner",
      passwordHash: "hashed_placeholder",
      role: "owner",
      gender: "male",
      university: "RUET",
      preferences: {
        sleepSchedule: "early_bird",
        smoking: "non_smoker",
        noiseTolerance: "quiet",
      },
      alertPreferences: {
        notifyOnNewListing: false,
      },
      fcmTokens: ["sample_fcm_token_abc123"],
    });
    console.log("✅ Owner created:");
    console.log(`   ID    : ${owner._id}`);
    console.log(`   Name  : ${owner.name}`);
    console.log(`   Role  : ${owner.role}`);
    console.log(`   Email : ${owner.email}\n`);

    // ── 4. Create a test User (Tenant) ───────────────────────────
    const tenant = await User.create({
      name: "Test Tenant",
      email: "testuser@colive.tenant",
      passwordHash: "hashed_placeholder",
      role: "tenant",
      gender: "female",
      university: "RUET",
      preferences: {
        sleepSchedule: "night_owl",
        smoking: "non_smoker",
        noiseTolerance: "moderate",
        budgetRange: { min: 3000, max: 8000 },
      },
      alertPreferences: {
        notifyOnNewListing: true,
        city: "Rajshahi",
        maxBudget: 8000,
      },
      fcmTokens: ["sample_fcm_token_xyz789"],
    });
    console.log("✅ Tenant created:");
    console.log(`   ID    : ${tenant._id}`);
    console.log(`   Name  : ${tenant.name}`);
    console.log(`   Role  : ${tenant.role}\n`);

    // ── 5. Create a test Property ────────────────────────────────
    const property = await Property.create({
      ownerId: owner._id,
      title: "CoLive Test Property",
      description: "A test property for DB verification",
      address: "123 Test Street, Rajshahi",
      city: "Rajshahi",
      location: {
        type: "Point",
        coordinates: [88.6042, 24.3745],
      },
      amenities: ["wifi", "generator", "parking"],
      rentRange: { min: 4000, max: 7000 },
      availableRooms: 2,
    });
    console.log("✅ Property created:");
    console.log(`   ID      : ${property._id}`);
    console.log(`   Title   : ${property.title}`);
    console.log(`   City    : ${property.city}`);
    console.log(`   Rent    : ${property.rentRange.min} - ${property.rentRange.max} BDT\n`);

    // ── 6. Create two Rooms under that Property ──────────────────
    const roomA = await Room.create({
      propertyId: property._id,
      label: "Room A",
      rent: 4000,
      status: "available",
      capacity: 2,
      currentTenants: [],
    });

    const roomB = await Room.create({
      propertyId: property._id,
      label: "Room B",
      rent: 7000,
      status: "occupied",
      capacity: 1,
      currentTenants: [tenant._id],
    });
    console.log("✅ Rooms created:");
    console.log(`   ${roomA.label} — ${roomA.status} — ${roomA.rent} BDT`);
    console.log(`   ${roomB.label} — ${roomB.status} — ${roomB.rent} BDT\n`);

    // ── 7. Read back and verify relationships ────────────────────
    const foundRooms = await Room.find({ propertyId: property._id })
      .populate("currentTenants", "name email role");

    console.log("✅ Rooms fetched with populated tenants:");
    for (const room of foundRooms) {
      const tenantList = room.currentTenants.length
        ? room.currentTenants.map((t) => t.name).join(", ")
        : "none";
      console.log(`   ${room.label} → tenants: ${tenantList}`);
    }
    console.log();

    // ── 8. Test schema validation (should fail) ──────────────────
    console.log("🔍 Testing schema validation (expecting an error)...");
    try {
      await User.create({
        name: "Bad User",
        email: "testuser@colive.bad",
        passwordHash: "x",
        role: "invalid_role", // not in enum
      });
      console.log("❌ Validation should have failed but didn't\n");
    } catch (err) {
      console.log(`✅ Validation correctly rejected invalid role: "${err.errors?.role?.message}"\n`);
    }

    // ── 9. Clean up ──────────────────────────────────────────────
    await Room.deleteMany({ propertyId: property._id });
    await Property.deleteOne({ _id: property._id });
    await User.deleteMany({ email: /testuser@colive/ });
    console.log("🧹 Test data cleaned up\n");

    console.log("✅ All tests passed. Your DB is set up correctly.");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

run();