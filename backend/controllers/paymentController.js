import Stripe from "stripe";
import Payment from "../models/Payment.js";
import Property from "../models/Property.js";
import Room from "../models/Room.js";
import BillSplit from "../models/BillSplit.js";

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null; // Return null instead of throwing to allow mock flow
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

// ── POST /api/payments/create-checkout-session ─────────────
export const createCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripe();
    const { roomId, propertyId, month, includeBillSplitId } = req.body;

    if (!roomId || !propertyId || !month) {
      return res.status(400).json({
        message: "roomId, propertyId, and month are required.",
      });
    }

    const room = await Room.findById(roomId);
    const property = await Property.findById(propertyId);

    if (!room || !property) {
      return res.status(404).json({
        message: "Room or property not found.",
      });
    }

    // block already-paid duplicate
    const existingPaid = await Payment.findOne({
      tenantId: req.user.id,
      roomId,
      propertyId,
      month,
      paymentStatus: "paid",
    });

    if (existingPaid) {
      return res.status(409).json({
        message: "Rent for this month is already paid.",
      });
    }

    // ── Resolve optional utility bill split ─────────────────
    let billSplit = null;
    let utilityAmount = 0;

    if (includeBillSplitId) {
      billSplit = await BillSplit.findOne({
        _id: includeBillSplitId,
        userId: req.user.id,
        status: "unpaid",
      }).populate({ path: "billId", select: "month propertyId" });

      if (billSplit) {
        utilityAmount = billSplit.amount;
      }
      // If not found or already paid, silently skip — don't block rent payment
    }

    // reuse existing pending/failed record if available
    let payment = await Payment.findOne({
      tenantId: req.user.id,
      roomId,
      propertyId,
      month,
      paymentStatus: { $in: ["pending", "failed"] },
    });

    if (!payment) {
      payment = await Payment.create({
        tenantId: req.user.id,
        roomId,
        propertyId,
        amount: room.rent,
        month,
        paymentStatus: "pending",
        currency: "BDT",
        paymentMethod: "card",
        utilityAmount,
        billSplitId: billSplit ? billSplit._id : null,
      });
    } else {
      payment.amount = room.rent;
      payment.paymentStatus = "pending";
      payment.currency = "BDT";
      payment.paymentMethod = "card";
      payment.paidAt = null;
      payment.utilityAmount = utilityAmount;
      payment.billSplitId = billSplit ? billSplit._id : null;
      await payment.save();
    }

    // ── Mock mode (no Stripe key) ────────────────────────────
    if (!stripe) {
      payment.paymentStatus = "paid";
      payment.paidAt = new Date();
      await payment.save();

      // Also clear the utility bill split if present
      if (billSplit) {
        billSplit.status = "paid";
        await billSplit.save();
      }

      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      return res.status(200).json({
        message: "Mock checkout completed.",
        url: `${clientUrl}/tenant/dashboard?payment=success`,
      });
    }

    // ── Build Stripe line items ──────────────────────────────
    const lineItems = [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: `${property.title} - ${room.label} Rent`,
            description: `Monthly rent for ${month}`,
          },
          // Stripe unit_amount is in smallest unit: paisa (100 paisa = 1 BDT)
          unit_amount: room.rent * 100,
        },
        quantity: 1,
      },
    ];

    if (billSplit && utilityAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "bdt",
          product_data: {
            name: `${property.title} - Utility Bill Share`,
            description: `Electricity, water, gas & internet for ${month}`,
          },
          unit_amount: Math.round(utilityAmount * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/tenant/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/tenant/dashboard?payment=cancelled`,
      metadata: {
        paymentId: payment._id.toString(),
        tenantId: req.user.id.toString(),
        roomId: roomId.toString(),
        propertyId: propertyId.toString(),
        month,
        originalRent: room.rent.toString(),
        // Include bill split ID so webhook/verify can clear it
        billSplitId: billSplit ? billSplit._id.toString() : "",
      },
    });

    payment.stripeSessionId = session.id;
    payment.stripePaymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null;

    await payment.save();

    return res.status(200).json({
      message: "Checkout session created successfully.",
      url: session.url,
    });
  } catch (err) {
    console.error("createCheckoutSession error:", err.message);
    return res.status(500).json({
      message: err.message || "Server error while creating checkout session.",
    });
  }
};

// ── GET /api/payments/verify-session ──────────────────────
export const verifySession = async (req, res) => {
  try {
    const stripe = getStripe();
    const { sessionId } = req.query;

    if (!stripe) {
      return res.status(400).json({ message: "Stripe not configured." });
    }
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required." });
    }

    // Retrieve the session directly from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(200).json({ status: session.payment_status });
    }

    const paymentId = session.metadata?.paymentId;
    if (!paymentId) {
      return res.status(400).json({ message: "No paymentId in session metadata." });
    }

    // Update the payment record to paid
    const updated = await Payment.findByIdAndUpdate(
      paymentId,
      {
        paymentStatus: "paid",
        paidAt: new Date(),
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripeTransactionId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      },
      { new: true }
    );

    // Also clear the utility bill split if it was included in this session
    const billSplitId = session.metadata?.billSplitId;
    if (billSplitId) {
      await BillSplit.findByIdAndUpdate(billSplitId, { status: "paid" });
    }

    return res.status(200).json({ status: "paid", payment: updated });
  } catch (err) {
    console.error("verifySession error:", err.message);
    return res.status(500).json({ message: err.message || "Server error." });
  }
};

// ── POST /api/payments/webhook ─────────────────────────────
export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        await Payment.findByIdAndUpdate(paymentId, {
          paymentStatus: "paid",
          paidAt: new Date(),
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          stripeTransactionId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
        });
      }

      // Also clear the utility bill split if it was included in this session
      const billSplitId = session.metadata?.billSplitId;
      if (billSplitId) {
        await BillSplit.findByIdAndUpdate(billSplitId, { status: "paid" });
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        await Payment.findByIdAndUpdate(paymentId, {
          paymentStatus: "failed",
          stripeSessionId: session.id,
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("stripeWebhook processing error:", err.message);
    return res.status(500).json({
      message: "Webhook processing failed.",
    });
  }
};

// ── GET /api/payments/my ───────────────────────────────────
export const getMyPayments = async (req, res) => {
  try {
    const { month, status } = req.query;

    const filter = {
      tenantId: req.user.id,
    };

    if (month) filter.month = month;
    if (status) filter.paymentStatus = status;

    const payments = await Payment.find(filter)
      .populate("roomId", "label rent")
      .populate("propertyId", "title city")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: payments.length,
      payments,
    });
  } catch (err) {
    console.error("getMyPayments error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/payments/property ─────────────────────────────
export const getPropertyPayments = async (req, res) => {
  try {
    const { month, status } = req.query;

    const myProperties = await Property.find({ ownerId: req.user.id }).select(
      "_id"
    );
    const propertyIds = myProperties.map((p) => p._id);

    const filter = {
      propertyId: { $in: propertyIds },
    };

    if (month) filter.month = month;
    if (status) filter.paymentStatus = status;

    const payments = await Payment.find(filter)
      .populate("tenantId", "name email")
      .populate("roomId", "label rent")
      .populate("propertyId", "title city ownerId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: payments.length,
      payments,
    });
  } catch (err) {
    console.error("getPropertyPayments error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── POST /api/payments/pay-utility ─────────────────────────────
// Standalone utility bill payment (when rent is already paid this month).
export const payUtilityOnly = async (req, res) => {
  try {
    const stripe = getStripe();
    const { billSplitId } = req.body;

    if (!billSplitId) {
      return res.status(400).json({ message: "billSplitId is required." });
    }

    // Load the split with full bill + property details
    const split = await BillSplit.findOne({
      _id: billSplitId,
      userId: req.user.id,
      status: "unpaid",
    }).populate({
      path: "billId",
      populate: { path: "propertyId", select: "title _id" },
    });

    if (!split) {
      return res.status(404).json({ message: "Unpaid utility bill not found or already paid." });
    }

    const property = split.billId?.propertyId;
    const month    = split.billId?.month;
    const roomId   = split.roomId;
    const utilityAmount = split.amount;

    // Reuse existing pending/failed utility-only payment record for this split
    let payment = await Payment.findOne({
      tenantId:    req.user.id,
      billSplitId: split._id,
      paymentStatus: { $in: ["pending", "failed"] },
    });

    if (!payment) {
      payment = await Payment.create({
        tenantId:      req.user.id,
        roomId,
        propertyId:    property._id,
        amount:        0,           // no rent — utility only
        utilityAmount,
        billSplitId:   split._id,
        month,
        paymentStatus: "pending",
        currency:      "BDT",
        paymentMethod: "card",
      });
    } else {
      payment.utilityAmount = utilityAmount;
      payment.amount        = 0;
      payment.paymentStatus = "pending";
      payment.paidAt        = null;
      await payment.save();
    }

    // ── Mock mode ──────────────────────────────────────────────
    if (!stripe) {
      payment.paymentStatus = "paid";
      payment.paidAt = new Date();
      await payment.save();

      split.status = "paid";
      await split.save();

      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      return res.status(200).json({
        message: "Mock utility checkout completed.",
        url: `${clientUrl}/tenant/dashboard?payment=success`,
      });
    }

    // ── Stripe session ─────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: `${property.title} - Utility Bill Share`,
              description: `Electricity, water, gas & internet for ${month}`,
            },
            unit_amount: Math.round(utilityAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/tenant/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/tenant/dashboard?payment=cancelled`,
      metadata: {
        paymentId:   payment._id.toString(),
        tenantId:    req.user.id.toString(),
        billSplitId: split._id.toString(),
        month,
      },
    });

    payment.stripeSessionId = session.id;
    payment.stripePaymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;
    await payment.save();

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("payUtilityOnly error:", err.message);
    return res.status(500).json({ message: err.message || "Server error." });
  }
};