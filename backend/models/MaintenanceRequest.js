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
      default: null,
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
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",                // ← NEW
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
    technicianName: {
      type: String,
      trim: true,
      default: "",                      // ← NEW (free-text technician name)
    },
    roomLabel: {
      type: String,
      trim: true,
      default: "",                      // ← NEW (free-text room label from tenant)
    },
    resolvedAt: {
      type: Date,
      default: null,                    // ← NEW (set when status → resolved)
    },
  },
  { timestamps: true }
);

const MaintenanceRequest = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
export default MaintenanceRequest;