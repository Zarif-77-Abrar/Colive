import mongoose from "mongoose";

const guestLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    guestName: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,         // ← NEW e.g. "Friend", "Parent", "Sibling"
      trim: true,
      default: "",
    },
    purpose: {
      type: String,         // ← NEW
      required: true,
      trim: true,
    },
    visitDate: {
      type: Date,
      required: true,
    },
    visitTime: {
      type: String,         // ← NEW — stored as "10:30 AM"
      required: true,
    },
    durationHours: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,         // ← NEW — replaces boolean approved
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approved: {             // kept for backward compatibility
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const GuestLog = mongoose.model("GuestLog", guestLogSchema);
export default GuestLog;