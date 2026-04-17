import mongoose from "mongoose";

const utilityBillSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    month: {
      type: String,
      required: true, // e.g. "2025-03"
      trim: true,
    },
    electricity: { type: Number, default: 0, min: 0 },
    water:       { type: Number, default: 0, min: 0 },
    gas:         { type: Number, default: 0, min: 0 },
    internet:    { type: Number, default: 0, min: 0 },
    total:       { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One bill per property per month
utilityBillSchema.index({ propertyId: 1, month: 1 }, { unique: true });

const UtilityBill = mongoose.model("UtilityBill", utilityBillSchema);
export default UtilityBill;
