import DailyMenu from "../models/DailyMenu.js";
import MealPreference from "../models/MealPreference.js";
import BookingRequest from "../models/BookingRequest.js";

const MEAL_OPTIONS = ["Fish Curry", "Chicken Curry", "Beef Curry", "Lentils", "Mixed Vegetables", "Egg Curry"];

// Returns today's date safely as YYYY-MM-DD string to match your teammate's schema
const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateRandomMenu = () => {
  const shuffled = MEAL_OPTIONS.sort(() => 0.5 - Math.random());
  return ["Rice", ...shuffled.slice(0, 2)]; // Rice is always default + 2 random items
};

// ── GET /api/meals/menu/:propertyId ───────────────────────
export const getPropertyMenu = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const dateStr = getTodayDateStr();

    let menu = await DailyMenu.findOne({ propertyId, dateStr });
    if (!menu) {
      menu = new DailyMenu({ propertyId, dateStr, items: generateRandomMenu() });
      await menu.save();
    }
    res.status(200).json({ menu });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/meals/preference ────────────────────────────
export const toggleMealPreference = async (req, res) => {
  try {
    const { mealEnabled } = req.body; 
    const dateStr = getTodayDateStr();
    
    const booking = await BookingRequest.findOne({ tenantId: req.user.id, status: "accepted" });
    if (!booking) return res.status(400).json({ message: "No active room found." });

    let pref = await MealPreference.findOne({ tenantId: req.user.id, date: dateStr });
    if (!pref) {
      // Using tenantId, optedIn, and string date to match your teammate's schema perfectly
      pref = new MealPreference({ 
        tenantId: req.user.id, 
        propertyId: booking.propertyId, 
        date: dateStr, 
        optedIn: mealEnabled 
      });
    } else {
      pref.optedIn = mealEnabled;
    }
    await pref.save();
    res.status(200).json({ preference: pref });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/meals/my-preference ──────────────────────────
export const getMyPreference = async (req, res) => {
  try {
    const dateStr = getTodayDateStr();
    const pref = await MealPreference.findOne({ tenantId: req.user.id, date: dateStr });
    // Map the DB 'optedIn' back to the frontend 'mealEnabled' expectation
    res.status(200).json({ mealEnabled: pref ? pref.optedIn : true }); // Default to Yes
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── GET /api/meals/stats/:propertyId ──────────────────────
export const getPropertyMealStats = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const dateStr = getTodayDateStr();
    
    // Get all tenants currently in this property
    const bookings = await BookingRequest.find({ propertyId, status: "accepted" }).populate("tenantId", "name email");
    // Fetch preferences specifically matching the string date
    const preferences = await MealPreference.find({ propertyId, date: dateStr });

    const stats = { yes: [], no: [] };
    
    bookings.forEach(b => {
      if (!b.tenantId) return;
      const pref = preferences.find(p => p.tenantId.toString() === b.tenantId._id.toString());
      
      // Default to true if no preference is explicitly set for today
      const isYes = pref ? pref.optedIn : true; 
      
      if (isYes) stats.yes.push(b.tenantId.name);
      else stats.no.push(b.tenantId.name);
    });

    res.status(200).json({ stats });
  } catch (err) { res.status(500).json({ message: err.message }); }
};