import PDFDocument from "pdfkit";
import BookingRequest from "../models/BookingRequest.js";
import RentalAgreement from "../models/RentalAgreement.js";

// ── POST /api/agreements/generate/:bookingId ─────────────────
// Tenant or Owner generates (and downloads) a PDF rental agreement
export const generateAgreement = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await BookingRequest.findById(bookingId)
      .populate("tenantId",   "name email phone university")
      .populate("ownerId",    "name email phone")
      .populate("roomId",     "label rent capacity")
      .populate("propertyId", "title address city");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // Only the tenant or owner of this booking may generate
    const userId = req.user.id;
    if (
      booking.tenantId._id.toString() !== userId &&
      booking.ownerId._id.toString()  !== userId
    ) {
      return res.status(403).json({ message: "You are not authorised to generate this agreement." });
    }

    if (booking.status !== "accepted") {
      return res.status(400).json({ message: "Agreement can only be generated for accepted bookings." });
    }

    // Persist / update the agreement record
    const startDate = booking.resolvedAt || new Date();
    const endDate   = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    await RentalAgreement.findOneAndUpdate(
      { bookingId: booking._id },
      {
        tenantId:    booking.tenantId._id,
        ownerId:     booking.ownerId._id,
        roomId:      booking.roomId._id,
        propertyId:  booking.propertyId._id,
        bookingId:   booking._id,
        startDate,
        endDate,
        rentAmount:  booking.roomId.rent,
        status:      "active",
      },
      { upsert: true, new: true }
    );

    // ── Generate PDF ──────────────────────────────────────────
    const doc = new PDFDocument({ margin: 55, size: "A4" });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.status(200).json({ pdfBase64: pdfBuffer.toString('base64') });
    });

    const PRIMARY   = "#1a3c5e";
    const SECONDARY = "#4a90d9";
    const TEXT      = "#222222";
    const MUTED     = "#777777";

    // ── Header ────────────────────────────────────────────────
    doc.rect(0, 0, 595, 90).fill(PRIMARY);
    doc.fontSize(26).font("Helvetica-Bold").fillColor("#ffffff")
       .text("CoLive", 55, 25);
    doc.fontSize(11).font("Helvetica").fillColor("#a8c8f0")
       .text("Co-Living Space Management Platform", 55, 57);
    doc.fillColor(TEXT);

    // ── Title ─────────────────────────────────────────────────
    doc.moveDown(2);
    doc.fontSize(18).font("Helvetica-Bold").fillColor(PRIMARY)
       .text("RENTAL AGREEMENT", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").fillColor(MUTED)
       .text(
         `Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
         { align: "center" }
       );
    doc.moveDown(0.4);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).lineWidth(1.5).stroke(SECONDARY);
    doc.moveDown(1);

    // ── Helpers ───────────────────────────────────────────────
    const sectionTitle = (title) => {
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica-Bold").fillColor(PRIMARY).text(title);
      doc.moveTo(55, doc.y + 2).lineTo(540, doc.y + 2).lineWidth(0.5).stroke("#cccccc");
      doc.moveDown(0.6);
    };

    const row = (label, value) => {
      doc.fontSize(10)
         .font("Helvetica-Bold").fillColor(MUTED).text(`${label}:`, { continued: true, width: 180 })
         .font("Helvetica").fillColor(TEXT).text(`  ${value || "—"}`);
    };

    // ── Section 1: Parties ────────────────────────────────────
    sectionTitle("1.  Parties to the Agreement");
    doc.fontSize(10).font("Helvetica-Bold").fillColor(SECONDARY).text("Tenant");
    doc.moveDown(0.2);
    row("Full Name",      booking.tenantId.name);
    row("Email",          booking.tenantId.email);
    row("Phone",          booking.tenantId.phone || "N/A");
    row("Institution",    booking.tenantId.university || "N/A");
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica-Bold").fillColor(SECONDARY).text("Landlord / Property Owner");
    doc.moveDown(0.2);
    row("Full Name",      booking.ownerId.name);
    row("Email",          booking.ownerId.email);
    row("Phone",          booking.ownerId.phone || "N/A");

    // ── Section 2: Property ───────────────────────────────────
    sectionTitle("2.  Property Details");
    row("Property Name",  booking.propertyId.title);
    row("Address",        booking.propertyId.address || booking.propertyId.city);
    row("Room",           booking.roomId.label);
    row("Room Capacity",  `${booking.roomId.capacity} person(s)`);

    // ── Section 3: Financial ──────────────────────────────────
    sectionTitle("3.  Agreement Duration & Rent");
    row("Start Date",     startDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
    row("End Date",       endDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
    row("Monthly Rent",   `BDT ${booking.roomId.rent.toLocaleString()}`);
    row("Payment Due",    "On or before the 5th of each calendar month");
    row("Late Payment",   "A late fee may be applied after a 7-day grace period");

    // ── Section 4: Clauses ────────────────────────────────────
    sectionTitle("4.  Terms & Conditions");

    const clauses = [
      `The Tenant agrees to pay the monthly rent of BDT ${booking.roomId.rent.toLocaleString()} on or before the 5th of each calendar month via the CoLive platform.`,
      "The Tenant shall not sublet, assign, or transfer the accommodation to any third party without prior written consent from the Landlord.",
      "The Tenant is responsible for maintaining the room and all shared common areas in a clean and orderly condition.",
      "Any maintenance issues or damage must be reported promptly through the CoLive Maintenance Request system.",
      "Utility bills (electricity, water, gas, internet) will be shared equally among all tenants of the property and are payable monthly.",
      "Either party may terminate this agreement by providing 30 (thirty) days written notice.",
      "The Tenant shall not engage in activities that cause disturbance to other residents or that violate the community rules of the property.",
      "The Landlord reserves the right to inspect the property upon giving 24 hours prior notice to the Tenant.",
      "This agreement is governed by and construed in accordance with the applicable laws of the People's Republic of Bangladesh.",
    ];

    clauses.forEach((clause, i) => {
      doc.fontSize(10).font("Helvetica").fillColor(TEXT)
         .text(`${i + 1}.  ${clause}`, { indent: 10, lineGap: 4 });
      doc.moveDown(0.2);
    });

    // ── Section 5: Signatures ─────────────────────────────────
    sectionTitle("5.  Signatures");
    doc.moveDown(0.5);

    const sigY = doc.y;
    // Tenant
    doc.fontSize(10).font("Helvetica").fillColor(MUTED).text("Tenant Signature", 55, sigY);
    doc.moveTo(55, sigY + 40).lineTo(240, sigY + 40).lineWidth(1).stroke("#333");
    doc.fontSize(10).font("Helvetica-Bold").fillColor(TEXT).text(booking.tenantId.name, 55, sigY + 45);
    doc.fontSize(9).font("Helvetica").fillColor(MUTED).text("Date: ___________________", 55, sigY + 58);

    // Owner
    doc.fontSize(10).font("Helvetica").fillColor(MUTED).text("Landlord Signature", 340, sigY);
    doc.moveTo(340, sigY + 40).lineTo(530, sigY + 40).lineWidth(1).stroke("#333");
    doc.fontSize(10).font("Helvetica-Bold").fillColor(TEXT).text(booking.ownerId.name, 340, sigY + 45);
    doc.fontSize(9).font("Helvetica").fillColor(MUTED).text("Date: ___________________", 340, sigY + 58);

    // ── Footer ────────────────────────────────────────────────
    doc.moveDown(6);
    doc.moveTo(55, doc.y).lineTo(540, doc.y).lineWidth(0.5).stroke("#dddddd");
    doc.moveDown(0.4);
    doc.fontSize(8).fillColor(MUTED)
       .text(
         `Generated by CoLive Platform · Booking ID: ${bookingId} · ${new Date().toISOString()}`,
         { align: "center" }
       );

    doc.end();
  } catch (err) {
    console.error("generateAgreement error:", err.message);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Server error generating agreement." });
    }
  }
};

// ── GET /api/agreements/my ───────────────────────────────────
export const getMyAgreements = async (req, res) => {
  try {
    const agreements = await RentalAgreement.find({ tenantId: req.user.id })
      .populate("propertyId", "title city")
      .populate("roomId",     "label rent")
      .populate("ownerId",    "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: agreements.length, agreements });
  } catch (err) {
    console.error("getMyAgreements error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/agreements/property ─────────────────────────────
export const getPropertyAgreements = async (req, res) => {
  try {
    const agreements = await RentalAgreement.find({ ownerId: req.user.id })
      .populate("propertyId", "title city")
      .populate("roomId",     "label rent")
      .populate("tenantId",   "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: agreements.length, agreements });
  } catch (err) {
    console.error("getPropertyAgreements error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
