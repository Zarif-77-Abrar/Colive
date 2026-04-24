import OpenAI from "openai";
import Property from "../models/Property.js";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy_key",
});

// Demo properties for context when DB is empty or OpenAI is unavailable
const DEMO_PROPERTIES = [
  { _id: "demo_001", title: "Skyline Dhaka Room",         rentRange: { min: 3500, max: 4500 }, city: "Dhaka",      address: "Banani, Dhaka",       amenities: ["WiFi", "AC", "Laundry"] },
  { _id: "demo_002", title: "Portside Chittagong Share",  rentRange: { min: 2500, max: 3500 }, city: "Chittagong", address: "GEC, Chittagong",     amenities: ["Furnished", "Kitchen"] },
  { _id: "demo_003", title: "Green Sylhet Hostel",        rentRange: { min: 2000, max: 3000 }, city: "Sylhet",     address: "Zindabazar, Sylhet",  amenities: ["Garden", "WiFi"] },
  { _id: "demo_004", title: "Quiet Rajshahi Studio",      rentRange: { min: 1500, max: 2500 }, city: "Rajshahi",   address: "RUET Area, Rajshahi", amenities: ["Study Desk", "Single Bed"] },
  { _id: "demo_005", title: "Budget Khulna CoLive",       rentRange: { min: 2000, max: 3000 }, city: "Khulna",     address: "Shibbari, Khulna",   amenities: ["WiFi", "Shared Kitchen"] },
];

// ── POST /api/recommendations ─────────────────────────────────
export const getRecommendations = async (req, res) => {
  try {
    const { userPreferences } = req.body;

    if (!userPreferences || !userPreferences.trim()) {
      return res.status(400).json({ message: "Please provide userPreferences." });
    }

    // Fetch live properties for context
    let liveProperties = [];
    try {
      const dbProperties = await Property.find()
        .select("title rentRange address city availableRooms amenities")
        .limit(20);
      liveProperties = dbProperties.map((p) => (p.toObject ? p.toObject() : p));
    } catch {
      console.warn("DB unreachable during recommendations fetch.");
    }

    const allProperties = [...liveProperties, ...DEMO_PROPERTIES];

    const isApiKeyMissing =
      !process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === "dummy_key" ||
      process.env.OPENAI_API_KEY === "";

    // ── Smart local fallback (no OpenAI key) ──────────────────
    if (isApiKeyMissing) {
      const query = userPreferences.toLowerCase();
      let filtered = [...allProperties];

      // Budget filter
      const budgetMatch = query.match(/(\d{3,6})/);
      if (budgetMatch) {
        const budget = parseInt(budgetMatch[0]);
        filtered = filtered.filter(
          (p) => p.rentRange?.min <= budget || p.rentRange?.max <= budget + 1000
        );
      }

      // City filter
      const cities = ["dhaka", "chittagong", "sylhet", "khulna", "rajshahi", "barisal", "comilla"];
      const foundCity = cities.find((c) => query.includes(c));
      if (foundCity) {
        filtered = filtered.filter((p) => p.city?.toLowerCase().includes(foundCity));
      }

      let resultProps = filtered.length > 0 ? filtered : allProperties;
      let message = "";

      if (budgetMatch && !foundCity) {
        resultProps = resultProps.slice(0, 2);
        message = "Found some options within your budget! Which city are you looking in?";
      } else if (foundCity && filtered.length === 0) {
        resultProps = allProperties.filter((p) => p.city?.toLowerCase().includes(foundCity)).slice(0, 2);
        message = `No exact matches in ${foundCity} for that budget, but here are nearby options.`;
      } else if (!foundCity && !budgetMatch) {
        resultProps = allProperties.slice(0, 3);
        message = "Tell me your preferred city and budget for a perfect match!";
      } else {
        message = "Based on your criteria, these properties look like a great fit!";
      }

      return res.status(200).json({
        message,
        recommendations: resultProps.slice(0, 3).map((p) => ({
          propertyId: p._id,
          title:      p.title,
          city:       p.city,
          address:    p.address,
          rentRange:  p.rentRange,
          reason: `This ${p.city} property matches your preferences. It features ${
            Array.isArray(p.amenities) ? p.amenities.join(", ") : "essential amenities"
          } and fits within TK ${p.rentRange?.min}–${p.rentRange?.max}/month.`,
        })),
      });
    }

    // ── OpenAI live path ──────────────────────────────────────
    const systemPrompt = `
      You are an AI assistant for "CoLive", a Bangladesh student housing platform.
      Recommend the top 3 best-matching properties based on student lifestyle, budget, and location.
      
      Available Properties:
      ${JSON.stringify(allProperties)}
      
      Return ONLY valid JSON in this exact format:
      {
        "recommendations": [
          { "propertyId": "string", "title": "string", "city": "string", "reason": "detailed explanation" }
        ],
        "message": "brief encouraging summary"
      }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system",  content: systemPrompt },
          { role: "user",    content: `My preferences: ${userPreferences}` },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content);
      return res.status(200).json(result);
    } catch (openaiErr) {
      console.error("OpenAI error:", openaiErr.message);
      return res.status(200).json({
        message: "AI service is busy. Showing local matches based on your criteria.",
        recommendations: allProperties.slice(0, 3).map((p) => ({
          propertyId: p._id,
          title:      p.title,
          city:       p.city,
          reason:     "Quick match based on local availability.",
        })),
      });
    }
  } catch (err) {
    console.error("getRecommendations error:", err.message);
    return res.status(500).json({ message: "Server error processing recommendations." });
  }
};
