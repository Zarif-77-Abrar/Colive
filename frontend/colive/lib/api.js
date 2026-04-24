// Backend URL — falls back to port 9209 if env var is not loaded
const _envUrl = typeof process !== "undefined" && process.env ? process.env.NEXT_PUBLIC_API_URL : null;
const BASE_URL = (_envUrl && _envUrl !== "undefined") ? _envUrl : "http://localhost:9209/api";

// ── Core fetch wrapper ─────────────────────────────────────
const request = async (endpoint, options = {}) => {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("token")
    : null;

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const res  = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.errors?.[0]?.msg || "Something went wrong.");
  }

  return data;
};

// ── Auth ───────────────────────────────────────────────────
export const authAPI = {
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login:    (body) => request("/auth/login",    { method: "POST", body: JSON.stringify(body) }),
  getMe:    ()     => request("/auth/me"),
  saveFcmToken: (token) => request("/auth/fcm-token", { method: "POST", body: JSON.stringify({ token }) }),
};

// ── Properties ─────────────────────────────────────────────
export const propertyAPI = {
  getAll:  (query = "") => request(`/properties${query}`),
  getById: (id)         => request(`/properties/${id}`),
  getMy:   ()           => request("/properties/my"),
  // ── My feature endpoints ──
  advSearch:    (query = "") => request(`/listing/adv-search${query}`),
  recommend:    (body)       => request("/recommendations", { method: "POST", body: JSON.stringify(body) }),
  getAmenities: (id)         => request(`/listing/${id}/amenities`),
  searchNearby: (lat, lng, radius = 2000, keyword = "") =>
    request(`/listing/nearby?lat=${lat}&lng=${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}`),
  create: (body) => request("/listing", { method: "POST", body: JSON.stringify(body) }),
  getDetail: (id) => request(`/listing/${id}`),
};

// ── Bookings ───────────────────────────────────────────────
export const bookingAPI = {
  getMy:       () => request("/bookings/my"),
  getReceived: () => request("/bookings/received"),
};

// ── Payments ───────────────────────────────────────────────
export const paymentAPI = {
  getMy:       () => request("/payments/my"),
  getProperty: () => request("/payments/property"),
};

// ── Maintenance ────────────────────────────────────────────
export const maintenanceAPI = {
  getMy:       () => request("/maintenance/my"),
  getProperty: () => request("/maintenance/property"),
};

// ── Notices ────────────────────────────────────────────────
export const noticeAPI = {
  getMy: () => request("/notices/my"),
};

// ── Messages ───────────────────────────────────────────────
export const messageAPI = {
  send: (body) => request("/messages", { method: "POST", body: JSON.stringify(body) }),
  getReceived: () => request("/messages/received"),
};

// ── Admin ──────────────────────────────────────────────────
export const adminAPI = {
  getStats:       () => request("/admin/stats"),
  getUsers:       () => request("/admin/users"),
  getProperties:  () => request("/admin/properties"),
  getBookings:    () => request("/admin/bookings"),
  getMaintenance: () => request("/admin/maintenance"),
  getNotices:     () => request("/admin/notices"),
  createAdmin:    (body) => request("/admin/create-admin", { method: "POST", body: JSON.stringify(body) }),
};

// ── Token helpers ──────────────────────────────────────────
export const saveToken   = (token) => localStorage.setItem("token", token);
export const getToken    = ()      => localStorage.getItem("token");
export const removeToken = ()      => localStorage.removeItem("token");
export const saveUser    = (user)  => localStorage.setItem("user", JSON.stringify(user));
export const getUser     = ()      => { const u = localStorage.getItem("user"); return u ? JSON.parse(u) : null; };
export const removeUser  = ()      => localStorage.removeItem("user");
export const logout      = ()      => { removeToken(); removeUser(); window.location.href = "/login"; };
