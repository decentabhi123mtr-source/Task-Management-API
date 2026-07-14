import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi, Notification } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const useNotifications = () => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (!isAuthenticated) return;
    if (showLoading) setIsLoading(true);
    try {
      const data = await notificationApi.list();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [isAuthenticated]);

  const markRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      
      await notificationApi.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      fetchNotifications(); // Rollback/Sync
    }
  };

  const markAllRead = async () => {
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      await notificationApi.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      fetchNotifications(); // Rollback/Sync
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(true);

      // Start 30s background polling
      intervalRef.current = setInterval(() => {
        fetchNotifications(false);
      }, 30000);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markRead,
    markAllRead,
  };
};
