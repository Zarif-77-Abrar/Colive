import mongoose from "mongoose";

const rentalAgreementSchema = new mongoose.Schema(
  {
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
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    rentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    agreementPdfUrl: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const RentalAgreement = mongoose.model("RentalAgreement", rentalAgreementSchema);
export default RentalAgreement;
