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
    throw new Error(data.message || data.errors?.[0]?.msg || "Something went wrong.");
  }

  return data;
};

export const authAPI = {
  register: (body) => request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login:    (body) => request("/auth/login",    { method: "POST", body: JSON.stringify(body) }),
  getMe:    ()     => request("/auth/me"),
};

export const userAPI = {
  getProfile:        ()     => request("/users/profile"),
  updateProfile:     (body) => request("/users/profile",     { method: "PUT", body: JSON.stringify(body) }),
  updatePreferences: (body) => request("/users/preferences", { method: "PUT", body: JSON.stringify(body) }),
};

export const propertyAPI = {
  getAll:  (query = "") => request(`/properties${query}`),
  getById: (id)         => request(`/properties/${id}`),
  getMy:   ()           => request("/properties/my"),
};

export const bookingAPI = {
  getMy:       () => request("/bookings/my"),
  getReceived: () => request("/bookings/received"),
};

export const paymentAPI = {
  getMy:       () => request("/payments/my"),
  getProperty: () => request("/payments/property"),
};

export const maintenanceAPI = {
  getMy:       () => request("/maintenance/my"),
  getProperty: () => request("/maintenance/property"),
};

export const noticeAPI = {
  getMy: () => request("/notices/my"),
};

export const compatibilityAPI = {
  getForRoom: (roomId) => request(`/compatibility/${roomId}`),
};

export const conversationAPI = {
  getAll:     ()                      => request("/conversations"),
  getById:    (id)                    => request(`/conversations/${id}`),
  create:     (participants, roomId)  => request("/conversations", { method: "POST", body: JSON.stringify({participants, roomId}) }),
  sendMessage: (conversationId, content) => request(`/conversations/${conversationId}/messages`, { method: "POST", body: JSON.stringify({content}) }),
  markAsRead: (conversationId)        => request(`/conversations/${conversationId}/read`, { method: "PUT" }),
  // delete:     (conversationId)        => request(`/conversations/${conversationId}`, { method: "DELETE" }),
};

export const adminAPI = {
  getStats:       () => request("/admin/stats"),
  getUsers:       () => request("/admin/users"),
  getProperties:  () => request("/admin/properties"),
  getBookings:    () => request("/admin/bookings"),
  getMaintenance: () => request("/admin/maintenance"),
  getNotices:     () => request("/admin/notices"),
  createAdmin:    (body) => request("/admin/create-admin", { method: "POST", body: JSON.stringify(body) }),
};

export const saveToken   = (token) => localStorage.setItem("token", token);
export const getToken    = ()      => localStorage.getItem("token");
export const removeToken = ()      => localStorage.removeItem("token");
export const saveUser    = (user)  => localStorage.setItem("user", JSON.stringify(user));
export const getUser     = ()      => { const u = localStorage.getItem("user"); return u ? JSON.parse(u) : null; };
export const removeUser  = ()      => localStorage.removeItem("user");
export const logout      = ()      => { removeToken(); removeUser(); window.location.href = "/login"; };
