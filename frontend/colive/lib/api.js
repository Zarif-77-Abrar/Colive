// Backend URL — falls back to port 9209 if env var is not loaded
const _envUrl = typeof process !== "undefined" && process.env ? process.env.NEXT_PUBLIC_API_URL : null;
const BASE_URL = (_envUrl && _envUrl !== "undefined") ? _envUrl : "http://localhost:9209/api";

const request = async (endpoint, options = {}) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || data.errors?.[0]?.msg || "Something went wrong.");
    err.code   = data.code ?? null;
    err.reason = data.reason ?? null;
    throw err;
  }

  return data;
};

export const authAPI = {
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login:    (body) => request("/auth/login",    { method: "POST", body: JSON.stringify(body) }),
  getMe:    ()     => request("/auth/me"),
  saveFcmToken: (token) => request("/auth/fcm-token", { method: "POST", body: JSON.stringify({ token }) }),
};

export const userAPI = {
  getProfile:        ()      => request("/users/profile"),
  updateProfile:     (body)  => request("/users/profile",     { method: "PUT",    body: JSON.stringify(body) }),
  updatePreferences: (body)  => request("/users/preferences", { method: "PUT",    body: JSON.stringify(body) }),
  saveFcmToken:      (token) => request("/users/fcm-token",   { method: "POST",   body: JSON.stringify({ token }) }),
  removeFcmToken:    (token) => request("/users/fcm-token",   { method: "DELETE", body: JSON.stringify({ token }) }),
};

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

export const bookingAPI = {
  getMy:        ()        => request("/bookings/my"),
  getReceived:  ()        => request("/bookings/received"),
  create:       (body)    => request("/bookings",               { method: "POST",  body: JSON.stringify(body) }),
  updateStatus: (id, s)   => request(`/bookings/${id}/status`,  { method: "PATCH", body: JSON.stringify({ status: s }) }),
  accept:       (id)      => request(`/bookings/${id}/accept`,  { method: "PUT" }),
  reject:       (id)      => request(`/bookings/${id}/reject`,  { method: "PUT" }),
  leave:        (id)      => request(`/bookings/${id}/leave`,   { method: "PUT" }),
};

export const paymentAPI = {
  getMy:                  (query = "") => request(`/payments/my${query}`),
  getProperty:            (query = "") => request(`/payments/property${query}`),
  createCheckoutSession:  (body)       => request("/payments/create-checkout-session", { method: "POST", body: JSON.stringify(body) }),
  verifySession:          (sessionId)  => request(`/payments/verify-session?sessionId=${sessionId}`),
  payUtilityBill:         (body)       => request("/payments/pay-utility", { method: "POST", body: JSON.stringify(body) }),
};

export const utilityBillAPI = {
  createOrUpdate: (body) => request("/bills",                  { method: "POST",  body: JSON.stringify(body) }),
  getProperty:    ()     => request("/bills/property"),
  getMy:          ()     => request("/bills/my"),
  markPaid:       (id)   => request(`/bills/splits/${id}/pay`, { method: "PATCH" }),
};

export const agreementAPI = {
  getMy:       () => request("/agreements/my"),
  getProperty: () => request("/agreements/property"),
  download: async (bookingId) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`${BASE_URL}/agreements/generate/${bookingId}`, {
      method: "POST",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to generate agreement." }));
      throw new Error(err.message);
    }
    const data = await res.json();
    return data.pdfBase64;
  },
};

export const maintenanceAPI = {
  getMy:              ()                   => request("/maintenance/my"),
  create:             (body)               => request("/maintenance",              { method: "POST",  body: JSON.stringify(body) }),
  confirmDone:        (id)                 => request(`/maintenance/${id}/confirm`,{ method: "PATCH" }),
  getProperty:        ()                   => request("/maintenance/property"),
  getAll:             ()                   => request("/maintenance/all"),
  updateStatus:       (id, status)         => request(`/maintenance/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  assignTechnician:   (id, technicianName) => request(`/maintenance/${id}/assign`, { method: "PATCH", body: JSON.stringify({ technicianName }) }),
};

export const guestLogAPI = {
  getMy:        ()           => request("/guests/my"),
  create:       (body)       => request("/guests",              { method: "POST",  body: JSON.stringify(body) }),
  getProperty:  ()           => request("/guests/property"),
  getAll:       ()           => request("/guests/all"),
  updateStatus: (id, status) => request(`/guests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// ── Notice ────────────────────────────────────────────────
export const noticeAPI = {
  getMy: () => request("/notices/my"),
  getTenant: () => request("/notices/tenant"),
  getAll: () => request("/notices/all"),
  create: (body) => request("/notices", { method: "POST", body: JSON.stringify(body) }),
};

// ── Meal ─────────────────────────────────────────────────
export const mealAPI = {
  getMenu: (propertyId) => request(`/meals/menu/${propertyId}`),
  getMyPreference: () => request("/meals/my-preference"),
  togglePreference: (mealEnabled) => request("/meals/preference", { method: "POST", body: JSON.stringify({ mealEnabled }) }),
  getStats: (propertyId) => request(`/meals/stats/${propertyId}`),
};


export const compatibilityAPI = {
  getForRoom: (roomId) => request(`/compatibility/${roomId}`),
};

export const conversationAPI = {
  getAll:      ()                            => request("/conversations"),
  getById:     (id)                          => request(`/conversations/${id}`),
  create:      (participants, relatedRoomId) => request("/conversations", { method: "POST", body: JSON.stringify({ participants, relatedRoomId }) }),
  sendMessage: (conversationId, content)     => request(`/conversations/${conversationId}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
  markAsRead:  (conversationId)              => request(`/conversations/${conversationId}/read`, { method: "PUT" }),
};

export const alertAPI = {
  sendEmergency: (tenantId) => request(`/alerts/emergency/${tenantId}`, { method: "POST" }),
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
  createAdmin:    (body)       => request("/admin/create-admin",            { method: "POST", body: JSON.stringify(body) }),
  blacklistUser:  (id, reason) => request(`/admin/users/${id}/blacklist`,   { method: "PUT",  body: JSON.stringify({ reason }) }),
  unblacklistUser:(id)         => request(`/admin/users/${id}/unblacklist`, { method: "PUT" }),
};

export const saveToken   = (token) => localStorage.setItem("token", token);
export const getToken    = ()      => localStorage.getItem("token");
export const removeToken = ()      => localStorage.removeItem("token");
export const saveUser    = (user)  => localStorage.setItem("user", JSON.stringify(user));
export const getUser     = ()      => { const u = localStorage.getItem("user"); return u ? JSON.parse(u) : null; };
export const removeUser  = ()      => localStorage.removeItem("user");
export const logout      = () => {
  const fcmToken = localStorage.getItem("fcmToken");
  removeToken();
  removeUser();
  localStorage.removeItem("fcmToken");
  localStorage.removeItem("fcmTokenUserId");
  if (fcmToken) userAPI.removeFcmToken(fcmToken).catch(() => {});
  window.location.href = "/login";
};



