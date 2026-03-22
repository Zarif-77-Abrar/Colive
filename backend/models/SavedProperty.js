import mongoose from "mongoose";

const savedPropertySchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

// Prevent a user from saving the same property twice
savedPropertySchema.index({ userId: 1, propertyId: 1 }, { unique: true });

const SavedProperty = mongoose.model("SavedProperty", savedPropertySchema);
export default SavedProperty;
