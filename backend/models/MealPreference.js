import mongoose from "mongoose";

const mealPreferenceSchema = new mongoose.Schema(
  {
    tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    date:       { type: String, required: true }, // YYYY-MM-DD
    optedIn:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One record per tenant per day
mealPreferenceSchema.index({ tenantId: 1, date: 1 }, { unique: true });

const MealPreference = mongoose.model("MealPreference", mealPreferenceSchema);
export default MealPreference;