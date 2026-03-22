import mongoose from "mongoose";

const mealPreferenceSchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true,
    },
    mealEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// One preference entry per user per property per day
mealPreferenceSchema.index(
  { userId: 1, propertyId: 1, date: 1 },
  { unique: true }
);

const MealPreference = mongoose.model("MealPreference", mealPreferenceSchema);
export default MealPreference;
