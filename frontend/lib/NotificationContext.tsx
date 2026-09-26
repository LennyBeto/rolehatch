// frontend/lib/NotificationContext.tsx
"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";

export type AppNotification = {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
};

type NotificationContextType = {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (message: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
  clearAll: () => {},
});

const MAX_NOTIFICATIONS = 50;
const storageKey = (userId: string) => `perchrole:notifications:${userId}`;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load this user's notifications from localStorage whenever the signed-in user changes
  useEffect(() => {
    setHydrated(false);
    if (!user) {
      setNotifications([]);
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(user.id));
      setNotifications(raw ? JSON.parse(raw) : []);
    } catch {
      setNotifications([]);
    } finally {
      setHydrated(true);
    }
  }, [user]);

  // Persist on every change (skip the initial load tick to avoid clobbering storage)
  useEffect(() => {
    if (!user || !hydrated) return;
    try {
      localStorage.setItem(storageKey(user.id), JSON.stringify(notifications));
    } catch {
      // storage full or unavailable — notifications still work for this session
    }
  }, [notifications, user, hydrated]);

  const addNotification = useCallback((message: string) => {
    setNotifications((prev) =>
      [
        { id: crypto.randomUUID(), message, createdAt: new Date().toISOString(), read: false },
        ...prev,
      ].slice(0, MAX_NOTIFICATIONS)
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAllRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);