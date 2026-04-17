import mongoose from "mongoose";
import dotenv from "dotenv";
import BookingRequest from "./models/BookingRequest.js";
import Payment from "./models/Payment.js";
import Room from "./models/Room.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Find all accepted bookings
    const bookings = await BookingRequest.find({ status: "accepted" });

    let added = 0;
    for (const b of bookings) {
      const existing = await Payment.findOne({
        tenantId: b.tenantId,
        roomId: b.roomId,
        month: currentMonth
      });

      if (!existing) {
        const room = await Room.findById(b.roomId);
        if (room) {
          await Payment.create({
            tenantId: b.tenantId,
            roomId: b.roomId,
            propertyId: b.propertyId,
            amount: room.rent,
            month: currentMonth,
            paymentStatus: "pending",
            currency: "BDT",
            paymentMethod: "card"
          });
          added++;
        }
      }
    }
    console.log(`Created ${added} missing payments for accepted bookings.`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
};

run();
