import Notice from "../models/Notice.js";
import Property from "../models/Property.js";
import BookingRequest from "../models/BookingRequest.js";
import User from "../models/User.js";
import { sendEmail, noticeEmail } from "../utils/sendEmail.js";

export const getMyNotices = async (req, res) => {
  try {
    const myProperties = await Property.find({ ownerId: req.user.id }).select("_id");
    const propertyIds  = myProperties.map((p) => p._id);
    const notices = await Notice.find({ propertyId: { $in: propertyIds } })
      .populate("propertyId", "title")
      .populate("createdBy",  "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: notices.length, notices });
  } catch (err) { return res.status(500).json({ message: "Server error." }); }
};

export const createNotice = async (req, res) => {
  try {
    const { title, message, propertyId } = req.body;
    let targetPropertyId = propertyId;

    if (req.user.role === "owner") {
      const prop = await Property.findOne({ _id: propertyId, ownerId: req.user.id });
      if (!prop) return res.status(403).json({ message: "Not authorized for this property." });
    } else if (req.user.role === "admin") {
      if (!propertyId || propertyId === "all") targetPropertyId = null;
    }

    const notice = new Notice({
      createdBy: req.user.id,
      propertyId: targetPropertyId,
      title, message,
    });
    await notice.save();

    // ── Email Broadcast Logic ──
    let tenantEmails = [];
    let propTitle = "All Properties (Platform Wide)";

    if (targetPropertyId) {
      const prop = await Property.findById(targetPropertyId);
      if (prop) propTitle = prop.title;
      // Get tenants with accepted bookings for this specific property
      const bookings = await BookingRequest.find({ propertyId: targetPropertyId, status: "accepted" }).populate("tenantId", "email");
      tenantEmails = bookings.map(b => b.tenantId?.email).filter(Boolean);
    } else {
      // Global admin notice - send to all active tenants
      const tenants = await User.find({ role: "tenant", isBlacklisted: false }).select("email");
      tenantEmails = tenants.map(t => t.email).filter(Boolean);
    }

    tenantEmails = [...new Set(tenantEmails)]; // Remove duplicates
    
    for (const email of tenantEmails) {
      // FIX: Spread the noticeEmail object instead of assigning it directly to 'html'
      await sendEmail({
        to: email,
        ...noticeEmail({ title, message, propertyTitle: propTitle })
      }).catch(err => console.error(`Email failed for ${email}`, err.message));
    }

    return res.status(201).json({ message: "Notice posted and emails dispatched.", notice });
  } catch (err) { return res.status(500).json({ message: err.message }); }
};

export const getTenantNotices = async (req, res) => {
  try {
    const booking = await BookingRequest.findOne({ tenantId: req.user.id, status: "accepted" });
    const propId = booking ? booking.propertyId : null;
    const query = { $or: [{ propertyId: null }] };
    if (propId) query.$or.push({ propertyId: propId });

    const notices = await Notice.find(query).populate("propertyId", "title").populate("createdBy", "name role").sort({ createdAt: -1 });
    res.status(200).json({ notices });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find().populate("propertyId", "title").populate("createdBy", "name role").sort({ createdAt: -1 });
    res.status(200).json({ notices });
  } catch (err) { res.status(500).json({ message: err.message }); }
};