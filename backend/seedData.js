import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import dns from "dns";

import User from "./models/User.js";
import Property from "./models/Property.js";
import Room from "./models/Room.js";
import { syncAllRooms } from "./utils/syncRoomStatus.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

const hash = async (pw) => bcrypt.hash(pw, 12);
const log  = (msg) => console.log(msg);

const SEED_TAG = "seed_colive_v1";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    log("✅ MongoDB connected\n");

    // ── Clean up previous seed data ───────────────────────
    await User.deleteMany({ university: SEED_TAG });
    await Property.deleteMany({ description: { $regex: SEED_TAG } });
    log("🧹 Previous seed data cleared\n");

    // ── Create owners ─────────────────────────────────────
    const owners = await User.insertMany([
      {
        name: "Hossain Rahman",
        email: "owner1@colive.test",
        passwordHash: await hash("Owner@1234"),
        role: "owner",
        gender: "male",
        phone: "01711000001",
        university: SEED_TAG,
      },
      {
        name: "Fatema Begum",
        email: "owner2@colive.test",
        passwordHash: await hash("Owner@1234"),
        role: "owner",
        gender: "female",
        phone: "01711000002",
        university: SEED_TAG,
      },
    ]);
    log(`✅ Created ${owners.length} owners`);

    // ── Create tenants with varied preferences ─────────────
    const tenantData = [
      {
        name: "Arif Hossain",
        email: "arif@colive.test",
        gender: "male",
        preferences: {
          sleepSchedule: "early_bird", smoking: "non_smoker", drinking: "no",
          noiseTolerance: "quiet", guestPolicy: "occasionally", cleanliness: "very_clean",
          studyHabits: "home_studier", dietaryHabit: "non_vegetarian", genderPreference: "any",
          budgetRange: { min: 3000, max: 6000 },
        },
      },
      {
        name: "Nadia Islam",
        email: "nadia@colive.test",
        gender: "female",
        preferences: {
          sleepSchedule: "early_bird", smoking: "non_smoker", drinking: "no",
          noiseTolerance: "quiet", guestPolicy: "no_guests", cleanliness: "very_clean",
          studyHabits: "home_studier", dietaryHabit: "vegetarian", genderPreference: "same_gender_only",
          budgetRange: { min: 3000, max: 5000 },
        },
      },
      {
        name: "Rakib Uddin",
        email: "rakib@colive.test",
        gender: "male",
        preferences: {
          sleepSchedule: "night_owl", smoking: "outdoor_only", drinking: "occasionally",
          noiseTolerance: "moderate", guestPolicy: "frequently", cleanliness: "moderate",
          studyHabits: "mixed", dietaryHabit: "non_vegetarian", genderPreference: "any",
          budgetRange: { min: 4000, max: 7000 },
        },
      },
      {
        name: "Sumaiya Akter",
        email: "sumaiya@colive.test",
        gender: "female",
        preferences: {
          sleepSchedule: "flexible", smoking: "non_smoker", drinking: "no",
          noiseTolerance: "moderate", guestPolicy: "occasionally", cleanliness: "moderate",
          studyHabits: "library", dietaryHabit: "vegetarian", genderPreference: "same_gender_only",
          budgetRange: { min: 3500, max: 6000 },
        },
      },
      {
        name: "Imran Hasan",
        email: "imran@colive.test",
        gender: "male",
        preferences: {
          sleepSchedule: "night_owl", smoking: "smoker", drinking: "yes",
          noiseTolerance: "loud", guestPolicy: "frequently", cleanliness: "relaxed",
          studyHabits: "mixed", dietaryHabit: "non_vegetarian", genderPreference: "any",
          budgetRange: { min: 5000, max: 9000 },
        },
      },
      {
        name: "Tasnim Jahan",
        email: "tasnim@colive.test",
        gender: "female",
        preferences: {
          sleepSchedule: "early_bird", smoking: "non_smoker", drinking: "no",
          noiseTolerance: "quiet", guestPolicy: "occasionally", cleanliness: "very_clean",
          studyHabits: "home_studier", dietaryHabit: "vegan", genderPreference: "same_gender_only",
          budgetRange: { min: 3000, max: 5500 },
        },
      },
    ];

    const pw = await hash("Tenant@1234");
    const tenants = await User.insertMany(
      tenantData.map((t) => ({
        ...t,
        passwordHash: pw,
        role: "tenant",
        university: SEED_TAG,
      }))
    );
    log(`✅ Created ${tenants.length} tenants`);
    tenants.forEach((t) => log(`   ${t.name} — ${t.email}`));

    // ── Create properties ──────────────────────────────────
    const prop1 = await Property.create({
      ownerId:     owners[0]._id,
      title:       "Sunshine Flat",
      description: `Modern shared flat near RUET campus. ${SEED_TAG}`,
      address:     "45 Talaimari, Rajshahi",
      city:        "Rajshahi",
      location:    { type: "Point", coordinates: [88.6042, 24.3745] },
      amenities:   ["wifi", "generator", "water_heater", "parking"],
      rentRange:   { min: 0, max: 0 },   // will be set by syncAllRooms
      availableRooms: 0,                  // will be set by syncAllRooms
    });

    const prop2 = await Property.create({
      ownerId:     owners[1]._id,
      title:       "Green View Hostel",
      description: `Quiet hostel close to Rajshahi Medical College. ${SEED_TAG}`,
      address:     "12 Laxmipur, Rajshahi",
      city:        "Rajshahi",
      location:    { type: "Point", coordinates: [88.5873, 24.3636] },
      amenities:   ["wifi", "generator", "common_kitchen", "security"],
      rentRange:   { min: 0, max: 0 },
      availableRooms: 0,
    });
    log(`\n✅ Created 2 properties`);

    // ── Create rooms ───────────────────────────────────────
    // Property 1:
    //   Room A — capacity 3, tenants: Arif + Rakib (2/3) → available
    //   Room B — capacity 2, tenants: Nadia (1/2)        → available
    //   Room C — capacity 2, no tenants                  → available
    await Room.insertMany([
      {
        propertyId:     prop1._id,
        label:          "Room A",
        rent:           5000,
        capacity:       3,
        currentTenants: [tenants[0]._id, tenants[2]._id],
      },
      {
        propertyId:     prop1._id,
        label:          "Room B",
        rent:           4500,
        capacity:       2,
        currentTenants: [tenants[1]._id],
      },
      {
        propertyId:     prop1._id,
        label:          "Room C",
        rent:           4000,
        capacity:       2,
        currentTenants: [],
      },
    ]);

    // Property 2:
    //   Room 1 — capacity 2, tenants: Sumaiya + Tasnim (2/2) → occupied
    //   Room 2 — capacity 2, tenants: Imran (1/2)            → available
    //   Room 3 — capacity 3, no tenants                      → available
    await Room.insertMany([
      {
        propertyId:     prop2._id,
        label:          "Room 1",
        rent:           4500,
        capacity:       2,
        currentTenants: [tenants[3]._id, tenants[5]._id],
      },
      {
        propertyId:     prop2._id,
        label:          "Room 2",
        rent:           5000,
        capacity:       2,
        currentTenants: [tenants[4]._id],
      },
      {
        propertyId:     prop2._id,
        label:          "Room 3",
        rent:           3500,
        capacity:       3,
        currentTenants: [],
      },
    ]);

    log(`✅ Created 6 rooms`);

    // ── Sync all room statuses ─────────────────────────────
    // This recalculates status from currentTenants vs capacity
    // and updates property availableRooms + rentRange caches
    const synced = await syncAllRooms();
    log(`✅ Synced status for ${synced} rooms`);

    // ── Summary ────────────────────────────────────────────
    log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    log("SEED SUMMARY");
    log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    log("\nOwner accounts (password: Owner@1234):");
    owners.forEach((o) => log(`  ${o.email}`));
    log("\nTenant accounts (password: Tenant@1234):");
    tenants.forEach((t) => log(`  ${t.email} — ${t.name}`));
    log("\nProperties:");
    log("  Sunshine Flat");
    log("    Room A — 2/3 tenants → available");
    log("    Room B — 1/2 tenants → available");
    log("    Room C — 0/2 tenants → available");
    log("  Green View Hostel");
    log("    Room 1 — 2/2 tenants → occupied");
    log("    Room 2 — 1/2 tenants → available");
    log("    Room 3 — 0/3 tenants → available");
    log("\n✅ Seed complete.");

  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    log("\n🔌 Disconnected from MongoDB");
  }
};

run();
