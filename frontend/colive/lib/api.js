const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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
    // Preserve the blacklist code so the login page can detect it
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
};

export const bookingAPI = {
  getMy:       ()     => request("/bookings/my"),
  getReceived: ()     => request("/bookings/received"),
  create:      (body) => request("/bookings",              { method: "POST", body: JSON.stringify(body) }),
  accept:      (id)   => request(`/bookings/${id}/accept`, { method: "PUT" }),
  reject:      (id)   => request(`/bookings/${id}/reject`, { method: "PUT" }),
};

export const paymentAPI = {
  getMy:       () => request("/payments/my"),
  getProperty: () => request("/payments/property"),
};

export const maintenanceAPI = {
  // Tenant
  getMy:          ()           => request("/maintenance/my"),
  create:         (body)       => request("/maintenance", { method: "POST", body: JSON.stringify(body) }),

  // Owner
  getProperty:    ()           => request("/maintenance/property"),

  // Admin
  getAll:         ()           => request("/maintenance/all"),

  // Owner + Admin
  updateStatus:   (id, status) => request(`/maintenance/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }),
  assignTechnician: (id, technicianName) => request(`/maintenance/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ technicianName }),
  }),
};

// ── Guest Log ────────────────────────────────────────────

export const guestLogAPI = {
  // Tenant
  getMy:    ()     => request("/guests/my"),
  create:   (body) => request("/guests", { method: "POST", body: JSON.stringify(body) }),
 
  // Owner
  getProperty: () => request("/guests/property"),
 
  // Admin
  getAll:   ()     => request("/guests/all"),
 
  // Owner + Admin
  updateStatus: (id, status) => request(`/guests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }),
};

export const noticeAPI = {
  getMy: () => request("/notices/my"),
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

export const adminAPI = {
  getStats:         () => request("/admin/stats"),
  getUsers:         () => request("/admin/users"),
  getProperties:    () => request("/admin/properties"),
  getBookings:      () => request("/admin/bookings"),
  getMaintenance:   () => request("/admin/maintenance"),
  getNotices:       () => request("/admin/notices"),
  createAdmin:      (body) => request("/admin/create-admin",        { method: "POST", body: JSON.stringify(body) }),
  blacklistUser:    (id, reason) => request(`/admin/users/${id}/blacklist`,   { method: "PUT", body: JSON.stringify({ reason }) }),
  unblacklistUser:  (id)  => request(`/admin/users/${id}/unblacklist`, { method: "PUT" }),
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
