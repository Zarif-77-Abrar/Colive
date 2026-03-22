import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true, // e.g. "Room A", "Room 101"
    },
    rent: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["available", "reserved", "occupied"],
      default: "available",
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    currentTenants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// When a room's status or rent changes, the parent Property's
// availableRooms and rentRange should be updated in the controller.
roomSchema.index({ propertyId: 1, status: 1 });

const Room = mongoose.model("Room", roomSchema);
export default Room;
