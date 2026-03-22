import mongoose from "mongoose";

const maintenanceRequestSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null, // null = property-wide issue
    },
    createdBy: {
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
    category: {
      type: String,
      enum: [
        "electrical",
        "plumbing",
        "gas",
        "appliance",
        "structural",
        "pest_control",
        "internet_tv",
        "cleaning",
        "security",
        "other",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "resolved"],
      default: "pending",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const MaintenanceRequest = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
export default MaintenanceRequest;
