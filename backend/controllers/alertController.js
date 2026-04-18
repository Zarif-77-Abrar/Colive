import User from "../models/User.js";
import Room from "../models/Room.js";
import Property from "../models/Property.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { sendEmail, emergencyAlertEmail } from "../utils/sendEmail.js";

// ── POST /api/alerts/emergency/:tenantId ───────────────────
// Owner sends an emergency alert to a specific tenant.
// Sends:
//   1. An in-app message to the tenant
//   2. An email to the tenant's emergency contact
export const sendEmergencyAlert = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const ownerId = req.user.id;

    // ── Validate tenant exists ─────────────────────────────
    const tenant = await User.findById(tenantId).select(
      "name email emergencyContact"
    );
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    // ── Verify owner has a property this tenant lives in ───
    const ownerProperties = await Property.find({ ownerId }).select("_id title");
    const propertyIds = ownerProperties.map((p) => p._id);

    const tenantRoom = await Room.findOne({
      propertyId:     { $in: propertyIds },
      currentTenants: tenantId,
    }).populate("propertyId", "title");

    if (!tenantRoom) {
      return res.status(403).json({
        message: "This tenant does not live in any of your properties.",
      });
    }

    const owner    = await User.findById(ownerId).select("name");
    const property = tenantRoom.propertyId;

    // ── 1. Send in-app message to tenant ──────────────────
    let conversation = await Conversation.findOne({
      participants:  { $all: [ownerId, tenantId] },
      relatedRoomId: tenantRoom._id,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants:  [ownerId, tenantId],
        relatedRoomId: tenantRoom._id,
      });
    }

    const inAppMessage = `🚨 EMERGENCY ALERT: This is an emergency alert from your property owner ${owner.name} at ${property.title}, ${tenantRoom.label}. Please respond immediately or contact emergency services if needed.`;

    await Message.create({
      conversationId: conversation._id,
      senderId:       ownerId,
      content:        inAppMessage,
      read:           false,
    });

    await Conversation.findByIdAndUpdate(conversation._id, {
      updatedAt: new Date(),
    });

    // ── 2. Send email to emergency contact ─────────────────
    const ec = tenant.emergencyContact;
    let emailSent = false;
    let emailError = null;

    if (ec?.email) {
      try {
        const template = emergencyAlertEmail({
          tenantName:    tenant.name,
          ownerName:     owner.name,
          propertyTitle: property.title,
          roomLabel:     tenantRoom.label,
          customNote:    null,
        });

        await sendEmail({
          to:      ec.email,
          subject: template.subject,
          html:    template.html,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("Emergency email failed:", emailErr.message);
        emailError = emailErr.message;
      }
    }

    return res.status(200).json({
      message:     "Emergency alert sent.",
      inAppMessage: true,
      emailSent,
      emailRecipient: ec?.email ?? null,
      emailError:  emailError ?? null,
      noEmailReason: !ec?.email
        ? "Tenant has no emergency contact email on file."
        : null,
    });

  } catch (err) {
    console.error("sendEmergencyAlert error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
