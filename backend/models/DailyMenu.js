import mongoose from "mongoose";

const dailyMenuSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
  dateStr:    { type: String, required: true }, // Format: YYYY-MM-DD
  items:      [{ type: String }]
}, { timestamps: true });

dailyMenuSchema.index({ propertyId: 1, dateStr: 1 }, { unique: true });

export default mongoose.model("DailyMenu", dailyMenuSchema);