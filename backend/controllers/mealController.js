import MealPreference from "../models/MealPreference.js";
import Room from "../models/Room.js";
import BookingRequest from "../models/BookingRequest.js";

export const getPropertyMeals = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { date } = req.query;

    const rooms = await Room.find({ propertyId }).populate("currentTenants", "name phone email");
    let allTenants = [];
    rooms.forEach(room => {
      room.currentTenants.forEach(tenant => {
        allTenants.push({ ...tenant.toObject(), roomLabel: room.label });
      });
    });

    const preferences = await MealPreference.find({ propertyId, date });
    const optedOutIds = preferences.filter(p => !p.optedIn).map(p => p.tenantId.toString());

    const yesList = [];
    const noList = [];

    allTenants.forEach(tenant => {
      if (optedOutIds.includes(tenant._id.toString())) {
        noList.push(tenant);
      } else {
        yesList.push(tenant);
      }
    });

    return res.status(200).json({ yesList, noList });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

export const getMyPreference = async (req, res) => {
  try {
    const { date } = req.query;
    const pref = await MealPreference.findOne({ tenantId: req.user.id, date });
    return res.status(200).json({ optedIn: pref ? pref.optedIn : true });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

export const toggleMyMeal = async (req, res) => {
  try {
    const { date, optedIn } = req.body;
    const accepted = await BookingRequest.findOne({ tenantId: req.user.id, status: "accepted" });
    if (!accepted) return res.status(400).json({ message: "You are not assigned to a property." });

    let pref = await MealPreference.findOne({ tenantId: req.user.id, date });
    if (pref) {
      pref.optedIn = optedIn;
      await pref.save();
    } else {
      pref = await MealPreference.create({ tenantId: req.user.id, propertyId: accepted.propertyId, date, optedIn });
    }
    return res.status(200).json({ message: "Meal preference updated.", optedIn: pref.optedIn });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};