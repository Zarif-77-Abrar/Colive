import nodemailer from "nodemailer";
import Notice          from "../models/Notice.js";
import Property        from "../models/Property.js";
import User            from "../models/User.js";
import BookingRequest  from "../models/BookingRequest.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendNoticeEmails = async (recipients, notice, propertyTitle) => {
  if (!recipients.length) {
    console.log("⚠️ No recipients found for this notice. Email skipped.");
    return;
  }
  console.log(`Attempting to send emails to: ${recipients.join(", ")}`);
  
  const subject = `[CoLive Notice] ${notice.title}`;
  const scope   = propertyTitle ? `Property: ${propertyTitle}` : "Platform-wide notice";
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #111827; padding: 24px 32px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">CoLive Notice</h1>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p style="font-size: 13px; color: #6b7280; margin: 0 0 8px;">${scope}</p>
        <h2 style="font-size: 20px; color: #111827; margin: 0 0 16px;">${notice.title}</h2>
        <p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 24px;">${notice.message}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 24px;" />
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          You received this notice because you are registered on CoLive.
        </p>
      </div>
    </div>
  `;

  const results = await Promise.allSettled(
    recipients.map((email) => transporter.sendMail({ from: `"CoLive" <${process.env.EMAIL_USER}>`, to: email, subject, html: htmlBody }))
  );

  results.forEach((res, index) => {
    if (res.status === "rejected") {
      console.error(`❌ Failed to send to ${recipients[index]}:`, res.reason.message);
    } else {
      console.log(`✅ Successfully sent email to ${recipients[index]}`);
    }
  });
};

export const createNotice = async (req, res) => {
  const { title, message, propertyId } = req.body;
  if (!title?.trim() || !message?.trim()) return res.status(400).json({ message: "Title and message are required." });

  try {
    const isAdmin  = req.user.role === "admin";
    const isGlobal = isAdmin && !propertyId;

    if (!isAdmin) {
      if (!propertyId) return res.status(400).json({ message: "Property ID is required." });
      const property = await Property.findOne({ _id: propertyId, ownerId: req.user.id });
      if (!property) return res.status(403).json({ message: "Property not found or access denied." });
    }

    const notice = await Notice.create({
      createdBy: req.user.id, propertyId: propertyId || null, title: title.trim(), message: message.trim(), isGlobal, readBy: [],
    });

    try {
      let emailRecipients = [];
      if (isGlobal) {
        const users = await User.find({ role: { $in: ["tenant", "owner"] }, isBlacklisted: { $ne: true } }).select("email");
        emailRecipients = users.map((u) => u.email).filter(Boolean);
      } else if (isAdmin && propertyId) {
        const prop = await Property.findById(propertyId).populate("ownerId", "email");
        const tenants = await User.find({ role: "tenant", isBlacklisted: { $ne: true } }).select("email");
        emailRecipients = tenants.map((u) => u.email).filter(Boolean);
        if (prop?.ownerId?.email) emailRecipients.push(prop.ownerId.email);
      } else {
        const acceptedBookings = await BookingRequest.find({ propertyId, status: "accepted" }).populate("tenantId", "email");
        emailRecipients = acceptedBookings.map((b) => b.tenantId?.email).filter(Boolean);
      }

      const property = propertyId ? await Property.findById(propertyId).select("title") : null;
      await sendNoticeEmails(emailRecipients, notice, property?.title ?? null);
    } catch (emailErr) {
      console.error("Notice email error:", emailErr.message);
    }

    const populated = await Notice.findById(notice._id).populate("propertyId", "title city").populate("createdBy",  "name role");
    return res.status(201).json({ message: "Notice posted.", notice: populated });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

export const getMyNotices = async (req, res) => {
  try {
    const myProperties = await Property.find({ ownerId: req.user.id }).select("_id");
    const propertyIds  = myProperties.map((p) => p._id);
    const notices = await Notice.find({ createdBy: req.user.id, propertyId: { $in: propertyIds } }).populate("propertyId", "title city").populate("createdBy",  "name role").sort({ createdAt: -1 });
    return res.status(200).json({ count: notices.length, notices });
  } catch (err) { return res.status(500).json({ message: "Server error." }); }
};

export const getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find({}).populate("propertyId", "title city").populate("createdBy",  "name role").sort({ createdAt: -1 });
    return res.status(200).json({ count: notices.length, notices });
  } catch (err) { return res.status(500).json({ message: "Server error." }); }
};

export const getTenantNotices = async (req, res) => {
  try {
    const accepted = await BookingRequest.find({ tenantId: req.user.id, status: "accepted" }).select("propertyId");
    const myPropertyIds = accepted.map((b) => b.propertyId);
    const notices = await Notice.find({ $or: [{ propertyId: { $in: myPropertyIds } }, { isGlobal: true }] })
      .populate("propertyId", "title city")
      .populate("createdBy",  "name role")
      .sort({ createdAt: -1 });
    
    // FIX: Added (n.readBy || []) fallback for old notices that don't have this array yet
    const withReadStatus = notices.map((n) => ({ 
      ...n.toObject(), 
      isRead: (n.readBy || []).some((id) => id.toString() === req.user.id) 
    }));
    const unreadCount = withReadStatus.filter((n) => !n.isRead).length;

    return res.status(200).json({ count: notices.length, unreadCount, notices: withReadStatus });
  } catch (err) { 
    console.error("getTenantNotices error:", err.message);
    return res.status(500).json({ message: "Server error." }); 
  }
};

export const markAsRead = async (req, res) => {
  try {
    await Notice.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user.id } });
    return res.status(200).json({ message: "Marked as read." });
  } catch (err) { return res.status(500).json({ message: "Server error." }); }
};

export const markAllAsRead = async (req, res) => {
  try {
    const accepted = await BookingRequest.find({ tenantId: req.user.id, status: "accepted" }).select("propertyId");
    const myPropertyIds = accepted.map((b) => b.propertyId);
    await Notice.updateMany({ $or: [{ propertyId: { $in: myPropertyIds } }, { isGlobal: true }], readBy: { $ne: req.user.id } }, { $addToSet: { readBy: req.user.id } });
    return res.status(200).json({ message: "All notices marked as read." });
  } catch (err) { return res.status(500).json({ message: "Server error." }); }
};