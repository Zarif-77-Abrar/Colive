import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    tenantId: {
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

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    month: {
      type: String,
      required: true, // YYYY-MM
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    stripeSessionId: {
      type: String,
      default: null,
    },

    stripeTransactionId: {
      type: String,
      default: null,
    },

    stripePaymentIntentId: {
      type: String,
      default: null,
    },

    currency: {
      type: String,
      default: "BDT",
    },

    paymentMethod: {
      type: String,
      default: "card",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    // ── Combined utility-bill fields (optional) ─────────────
    // Populated when a utility bill share is included in the same checkout session.
    utilityAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    billSplitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillSplit",
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index(
  { tenantId: 1, roomId: 1, propertyId: 1, month: 1 },
  { unique: false }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;