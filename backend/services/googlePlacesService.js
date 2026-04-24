import axios from "axios";

/**
 * Fetches nearby amenities using Google Places API and calculates a safety score.
 * Falls back to realistic simulated data if no valid API key is found.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} [radius=2000] - Search radius in meters
 * @param {string} [keyword] - Optional keyword for broader search
 */
export const fetchNearbyAmenities = async (lat, lng, radius = 2000, keyword = "") => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Fallback to realistic demo data when no real API key is configured
  if (!apiKey || apiKey === "dummy" || apiKey === "") {
    console.warn("Using simulated Places data (no API key configured).");
    const seed = Math.abs(Math.floor(lat * lng * 10000)) || 42;
    const randomScore = 3.5 + (seed % 15) / 10; // between 3.5 and 4.9

    return {
      safetyScore: Number(randomScore.toFixed(1)),
      amenities: {
        hospital:   [{ name: "City General Hospital",  rating: 4.5, vicinity: `${(seed % 5 + 1) / 10} km away` }],
        police:     [{ name: "Central Police Station", rating: 4.0, vicinity: `${(seed % 8 + 2) / 10} km away` }],
        park:       [{ name: "Green View Park",        rating: 4.8, vicinity: "0.5 km away" }],
        restaurant: [
          { name: "Taste of Dhaka",  rating: 4.2, vicinity: "0.3 km away" },
          { name: "Bismillah Cafe",  rating: 4.0, vicinity: "0.6 km away" },
        ],
        school: [{ name: "International School", rating: 4.6, vicinity: "1.2 km away" }],
      },
    };
  }

  try {
    const types = ["hospital", "police", "park", "restaurant", "school", "pharmacy", "supermarket", "transit_station"];
    const results = {};
    const baseParams = {
      location: `${lat},${lng}`,
      radius,
      key: apiKey,
      ...(keyword ? { keyword } : {}),
    };

    await Promise.all(
      types.map(async (type) => {
        const response = await axios.get(
          "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
          { params: { ...baseParams, type } }
        );
        if (response.data.status === "OK") {
          results[type] = response.data.results.slice(0, 3).map((place) => ({
            name:     place.name,
            rating:   place.rating || "N/A",
            vicinity: place.vicinity || place.formatted_address || "Unknown location",
            placeId:  place.place_id,
          }));
        } else {
          results[type] = [];
        }
      })
    );

    const hasHighRated = (list) => list.some((p) => typeof p.rating === "number" && p.rating >= 4.0);

    let safetyScore = 1.5;
    if (results.police?.length)          safetyScore += 1.2;
    if (results.hospital?.length)        safetyScore += 1.0;
    if (results.pharmacy?.length)        safetyScore += 0.5;
    if (results.supermarket?.length)     safetyScore += 0.3;
    if (results.park?.length)            safetyScore += hasHighRated(results.park) ? 0.4 : 0.2;
    if (results.school?.length)          safetyScore += 0.3;
    if (results.transit_station?.length) safetyScore += 0.3;
    if (results.restaurant?.length)      safetyScore += 0.2;

    return {
      safetyScore: Number(Math.min(safetyScore, 5.0).toFixed(1)),
      amenities: results,
    };
  } catch (error) {
    console.error("Google Places API error:", error.message);
    throw new Error("Failed to fetch neighborhood data.");
  }
};
