"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { propertyAPI, bookingAPI, messageAPI, getUser } from "./api";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const addNotification = (title, message, type) => {
    setNotifications((prev) => [
      { id: Date.now() + Math.random(), title, message, type, read: false, createdAt: new Date() },
      ...prev,
    ]);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fetchLatest = async () => {
      try {
        const user = getUser();
        if (!user) return;
        
        const cacheBuster = `?t=${Date.now()}`;

        // 1. TENANTS AND ADMINS: New properties alert
        if (user.role === "tenant" || user.role === "admin") {
          try {
            const data = await propertyAPI.getAll(cacheBuster);
            const props = data.properties || [];
            if (props.length > 0) {
              const newestProp = props[0];
              const storageKey = "colive_latest_prop_id_v7";
              const lastSeenId = localStorage.getItem(storageKey);
              
              if (lastSeenId !== newestProp._id) {
                 addNotification(`🏠 New Property!`, `${newestProp.title} in ${newestProp.city}`, 'property');
              }
              localStorage.setItem(storageKey, newestProp._id);
            }
          } catch (err) { console.error("Prop poll error:", err); }
        }

        // 2. OWNERS: New bookings alert
        if (user.role === "owner") {
          try {
            const data = await bookingAPI.getReceived();
            const bookings = data.bookings || [];
            if (bookings.length > 0) {
              const latest = bookings[0];
              const storageKey = "colive_latest_booking_id_v7";
              const lastSeenId = localStorage.getItem(storageKey);
              
              if (lastSeenId !== latest._id) {
                 const tenantName = latest.tenantId?.name || "A tenant";
                 const propTitle = latest.propertyId?.title || "your property";
                 addNotification(`🔔 Booking Request`, `${tenantName} requested to book ${propTitle}`, 'booking');
              }
              localStorage.setItem(storageKey, latest._id);
            }
          } catch (err) { console.error("Booking poll error:", err); }
        }
        
        // 3. ANY USER: New messages alert
        try {
          const mData = await messageAPI.getReceived();
          const messages = mData.messages || [];
          if (messages.length > 0) {
            const latestMsg = messages[0];
            const storageKey = "colive_latest_msg_id_v7";
            const lastSeenMsgId = localStorage.getItem(storageKey);
            
            if (lastSeenMsgId !== latestMsg._id) {
               const senderName = latestMsg.senderId?.name || "Someone";
               addNotification(`💬 New Message`, `${senderName}: "${latestMsg.content}"`, 'message');
            }
            localStorage.setItem(storageKey, latestMsg._id);
          }
        } catch (err) { console.error("Msg poll error:", err); }

      } catch (err) {
        console.error("Global polling error:", err);
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showDropdown,
        setShowDropdown,
        markAsRead,
        clearAll,
        addNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
