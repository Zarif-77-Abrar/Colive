import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],                              // [longitude, latitude]
      default: [0, 0],
    },
  },
  { _id: false }
);

const rentRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
  },
  { _id: false }
);

const safetyRatingSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: locationSchema,
      default: {},
    },
    rentRange: {
      type: rentRangeSchema,
      default: {},
    },
    availableRooms: {
      type: Number,
      default: 0,
      min: 0,
    },
    amenities: {
      type: [String],
      default: [],
    },
    safetyRating: {
      type: safetyRatingSchema,
      default: {},
    },
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Enables geospatial queries like "find properties near me"
propertySchema.index({ location: "2dsphere" });
propertySchema.index({ city: 1 });

const Property = mongoose.model("Property", propertySchema);
export default Property;
