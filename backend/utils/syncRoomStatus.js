import Room from "../models/Room.js";
import Property from "../models/Property.js";

// ── syncRoomStatus ─────────────────────────────────────────
// Recalculates a room's status based on actual occupancy,
// then updates the parent property's availableRooms count
// and rentRange cache.
//
// Call this whenever currentTenants changes on a room:
//   - booking accepted (tenant added)
//   - tenant leaves (tenant removed)
//   - seed script after inserting rooms
//
// Usage:
//   await syncRoomStatus(room);    // pass a Room document
//   await syncRoomStatus(roomId);  // or just the ID string

export const syncRoomStatus = async (roomOrId) => {
  const room = (roomOrId && typeof roomOrId === "object" && roomOrId.save)
    ? roomOrId
    : await Room.findById(roomOrId);

  if (!room) throw new Error("Room not found in syncRoomStatus.");

  // ── Recalculate room status ──────────────────────────────
  const occupancy = room.currentTenants.length;
  const newStatus =
    occupancy >= room.capacity ? "occupied" : "available";

  if (room.status !== newStatus) {
    room.status = newStatus;
    await room.save();
  }

  // ── Recalculate parent property caches ───────────────────
  const allRooms = await Room.find({ propertyId: room.propertyId });

  const availableRooms = allRooms.filter(r => r.status === "available").length;

  const rents = allRooms.map(r => r.rent).filter(Boolean);
  const rentRange = rents.length > 0
    ? { min: Math.min(...rents), max: Math.max(...rents) }
    : { min: 0, max: 0 };

  await Property.findByIdAndUpdate(room.propertyId, {
    availableRooms,
    rentRange,
  });

  return room;
};

// ── syncAllRooms ───────────────────────────────────────────
// Runs syncRoomStatus across every room in the DB.
// Useful for the seed script and one-time fixes.
export const syncAllRooms = async () => {
  const rooms = await Room.find({});
  for (const room of rooms) {
    await syncRoomStatus(room);
  }
  return rooms.length;
};
