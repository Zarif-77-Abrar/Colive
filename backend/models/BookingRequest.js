import mongoose from "mongoose";

const bookingRequestSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn"],
      default: "pending",
    },
    message: {
      type: String,
      trim: true, // Optional message from tenant to owner
    },
    compatibilityScore: {
      type: Number,
      min: 0,
      max: 100,
      // Snapshot of the score at time of request
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent a tenant from sending duplicate pending requests for the same room
bookingRequestSchema.index(
  { roomId: 1, tenantId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

const BookingRequest = mongoose.model("BookingRequest", bookingRequestSchema);
export default BookingRequest;
