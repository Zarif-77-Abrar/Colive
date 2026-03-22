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
    visitDate: {
      type: Date,
      required: true,
    },
    durationHours: {
      type: Number,
      min: 0,
    },
    approved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const GuestLog = mongoose.model("GuestLog", guestLogSchema);
export default GuestLog;
