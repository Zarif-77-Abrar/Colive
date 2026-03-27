import Stripe from "stripe";
import Payment from "../models/Payment.js";
import Property from "../models/Property.js";
import Room from "../models/Room.js";

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is missing in .env");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

// ── POST /api/payments/create-checkout-session ─────────────
export const createCheckoutSession = async (req, res) => {
  try {
    const stripe = getStripe();
    const { roomId, propertyId, month } = req.body;

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

    // Save original room rent in DB
    const payment = await Payment.create({
      tenantId: req.user.id,
      roomId,
      propertyId,
      amount: room.rent,
      month,
      paymentStatus: "pending",
    });

    // TEMPORARY TEST CONVERSION:
    // 3500 -> $35, 4000 -> $40, 5000 -> $50
    const checkoutAmountUsd = Math.max(1, Math.round(room.rent / 100));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${property.title} - ${room.label} Rent`,
              description: `Monthly rent for ${month}`,
            },
            unit_amount: checkoutAmountUsd * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/tenant/dashboard?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/tenant/dashboard?payment=cancelled`,
      metadata: {
        paymentId: payment._id.toString(),
        tenantId: req.user.id.toString(),
        roomId: roomId.toString(),
        propertyId: propertyId.toString(),
        month,
        originalRent: room.rent.toString(),
        checkoutAmountUsd: checkoutAmountUsd.toString(),
      },
    });

    payment.stripeSessionId = session.id;
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
        });
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        await Payment.findByIdAndUpdate(paymentId, {
          paymentStatus: "failed",
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
    const payments = await Payment.find({ tenantId: req.user.id })
      .populate("roomId", "label rent")
      .populate("propertyId", "title city")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: payments.length, payments });
  } catch (err) {
    console.error("getMyPayments error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/payments/property ─────────────────────────────
export const getPropertyPayments = async (req, res) => {
  try {
    const myProperties = await Property.find({ ownerId: req.user.id }).select("_id");
    const propertyIds = myProperties.map((p) => p._id);

    const payments = await Payment.find({ propertyId: { $in: propertyIds } })
      .populate("tenantId", "name email")
      .populate("roomId", "label")
      .populate("propertyId", "title city")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: payments.length, payments });
  } catch (err) {
    console.error("getPropertyPayments error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};