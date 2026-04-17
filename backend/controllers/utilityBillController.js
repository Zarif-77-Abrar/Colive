import UtilityBill from "../models/UtilityBill.js";
import BillSplit from "../models/BillSplit.js";
import Property from "../models/Property.js";
import Room from "../models/Room.js";
import Payment from "../models/Payment.js";

// ── POST /api/bills ─────────────────────────────────────────
// Owner enters electricity/water/gas/internet for a property+month.
// System splits total equally among all current tenants.
export const createOrUpdateBill = async (req, res) => {
  try {
    const { propertyId, month, electricity = 0, water = 0, gas = 0, internet = 0 } = req.body;

    if (!propertyId || !month) {
      return res.status(400).json({ message: "propertyId and month are required." });
    }

    // Verify ownership
    const property = await Property.findOne({ _id: propertyId, ownerId: req.user.id });
    if (!property) {
      return res.status(403).json({ message: "Property not found or you are not the owner." });
    }

    const total = Number(electricity) + Number(water) + Number(gas) + Number(internet);

    // Upsert the utility bill record
    const bill = await UtilityBill.findOneAndUpdate(
      { propertyId, month },
      { electricity, water, gas, internet, total },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Collect all current tenants across all rooms of this property
    const rooms = await Room.find({ propertyId }).select("currentTenants _id");
    const tenantRoomPairs = [];
    for (const room of rooms) {
      for (const tenantId of room.currentTenants) {
        tenantRoomPairs.push({ tenantId, roomId: room._id });
      }
    }

    if (tenantRoomPairs.length === 0) {
      return res.status(200).json({
        message: "Bill saved. No tenants currently in this property.",
        bill,
        splits: [],
      });
    }

    // Equal share per tenant
    const share = +(total / tenantRoomPairs.length).toFixed(2);

    // Remove old splits for this bill and recreate
    await BillSplit.deleteMany({ billId: bill._id });

    const splits = await BillSplit.insertMany(
      tenantRoomPairs.map(({ tenantId, roomId }) => ({
        billId: bill._id,
        userId: tenantId,
        roomId,
        amount: share,
        status: "unpaid",
      }))
    );

    return res.status(200).json({
      message: `Bill saved. Split BDT ${share} each among ${tenantRoomPairs.length} tenant(s).`,
      bill,
      splits,
    });
  } catch (err) {
    console.error("createOrUpdateBill error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/bills/my ────────────────────────────────────────
// Tenant sees all their bill splits
export const getMyBillSplits = async (req, res) => {
  try {
    const splits = await BillSplit.find({ userId: req.user.id })
      .populate({
        path: "billId",
        populate: { path: "propertyId", select: "title city" },
      })
      .populate("roomId", "label")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: splits.length, splits });
  } catch (err) {
    console.error("getMyBillSplits error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/bills/property ──────────────────────────────────
// Owner sees all utility bills for their properties (with split count)
export const getPropertyBills = async (req, res) => {
  try {
    const myProperties = await Property.find({ ownerId: req.user.id }).select("_id");
    const propertyIds = myProperties.map((p) => p._id);

    const bills = await UtilityBill.find({ propertyId: { $in: propertyIds } })
      .populate("propertyId", "title city")
      .sort({ month: -1, createdAt: -1 });

    return res.status(200).json({ count: bills.length, bills });
  } catch (err) {
    console.error("getPropertyBills error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PATCH /api/bills/splits/:id/pay ─────────────────────────
// Tenant marks their share as paid (manual / cash method)
export const markSplitPaid = async (req, res) => {
  try {
    // Populate bill so we have month + propertyId
    const split = await BillSplit.findById(req.params.id).populate("billId");
    if (!split) return res.status(404).json({ message: "Bill split not found." });

    if (split.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only pay your own bill." });
    }
    if (split.status === "paid") {
      return res.status(400).json({ message: "This bill is already marked as paid." });
    }

    split.status = "paid";
    await split.save();

    // ── Create a Payment record so it appears in payment history ──
    try {
      const bill = split.billId;
      // Only create if we don't already have a payment for this split
      const existing = await Payment.findOne({ billSplitId: split._id });
      if (!existing && bill) {
        await Payment.create({
          tenantId:      split.userId,
          roomId:        split.roomId,
          propertyId:    bill.propertyId,
          amount:        0,              // no rent — utility only
          utilityAmount: split.amount,
          billSplitId:   split._id,
          month:         bill.month,
          paymentStatus: "paid",
          currency:      "BDT",
          paymentMethod: "manual",      // distinguishes from Stripe payments
          paidAt:        new Date(),
        });
      }
    } catch (payErr) {
      // Don't fail the whole request if Payment record creation fails
      console.warn("markSplitPaid: could not create Payment record:", payErr.message);
    }

    return res.status(200).json({ message: "Bill share marked as paid.", split });
  } catch (err) {
    console.error("markSplitPaid error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
