import mongoose from "mongoose";
import dotenv from "dotenv";
import Property from "./models/Property.js";
import Room from "./models/Room.js";
import { syncAllRooms } from "./utils/syncRoomStatus.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const properties = await Property.find({});
    let totalRoomsAdded = 0;
    
    for (const prop of properties) {
      const roomCount = await Room.countDocuments({ propertyId: prop._id });
      
      if (roomCount === 0) {
        // This property has no rooms. Let's add some!
        const baseRent = prop.rentRange?.min || 3000;
        
        await Room.insertMany([
          {
            propertyId: prop._id,
            label: "Basic Room",
            rent: baseRent,
            capacity: 2,
            currentTenants: [],
            status: "available"
          },
          {
            propertyId: prop._id,
            label: "Premium Room",
            rent: baseRent + 1500,
            capacity: 1,
            currentTenants: [],
            status: "available"
          }
        ]);
        
        console.log(`Added 2 rooms to property: ${prop.title}`);
        totalRoomsAdded += 2;
      }
    }

    if (totalRoomsAdded > 0) {
      console.log(`✅ Added ${totalRoomsAdded} new rooms in total. Syncing statuses...`);
      const synced = await syncAllRooms();
      console.log(`✅ Synced status for ${synced} rooms`);
    } else {
      console.log("No empty properties found. Everything is populated!");
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected");
  }
};

run();
