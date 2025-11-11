import { useState, useEffect, useCallback } from "react";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from "@/api/notifications";
import { toast } from "@/lib/utils";

/**
 * Hook quản lý thông báo cho admin
 * 
 * CHỨC NĂNG:
 * - Lấy danh sách notifications từ API
 * - Đánh dấu đã đọc, xóa thông báo
 * - Quản lý state: notifications, unreadCount, loading
 * 
 * LƯU Ý:
 * - Hook này CHỈ xử lý API và state
 * - Logic WebSocket được tách riêng ở component (AdminHeader.jsx)
 */
export function useAdminNotifications() {
  const [notifications, setNotifications] = useState([]);//danh sách thông báo
  const [unreadCount, setUnreadCount] = useState(0);//số lượng thông báo chưa đọc
  const [loading, setLoading] = useState(false);//loading

  // Lấy danh sách thông báo từ API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getNotifications();
      setNotifications(response.data.items || []);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thông báo:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lấy số lượng chưa đọc từ API
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await getUnreadCount();
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      console.error("Lỗi khi lấy số lượng thông báo chưa đọc:", error);
    }
  }, []);

  // Đánh dấu đã đọc
  const handleMarkAsRead = useCallback(async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));//đánh dấu thông báo đã đọc
      setUnreadCount(prev => Math.max(0, prev - 1));//giảm số lượng thông báo chưa đọc
    } catch (error) {
      console.error("Lỗi khi đánh dấu đã đọc:", error);
      toast.error("Không thể đánh dấu đã đọc");
    }
  }, []);

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));//đánh dấu tất cả thông báo đã đọc
      setUnreadCount(0);//reset số lượng thông báo chưa đọc
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch (error) {
      console.error("Lỗi khi đánh dấu tất cả đã đọc:", error);
      toast.error("Không thể đánh dấu tất cả đã đọc");
    }
  }, []);

  // Xóa thông báo
  const handleDelete = useCallback(async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));//xóa thông báo khỏi danh sách
      toast.success("Đã xóa thông báo");
    } catch (error) {
      console.error("Lỗi khi xóa thông báo:", error);
      const errorMessage = error.response?.data?.message || "Không thể xóa thông báo";
      toast.error(errorMessage);
    }
  }, []);

  // Lấy dữ liệu ban đầu khi component mount
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,//danh sách thông báo
    unreadCount,//số lượng thông báo chưa đọc
    loading,//loading
    fetchNotifications,      //lấy danh sách thông báo
    fetchUnreadCount,       //lấy số lượng thông báo chưa đọc
    handleMarkAsRead,//đánh dấu đã đọc
    handleMarkAllAsRead,//đánh dấu tất cả đã đọc
    handleDelete//xóa thông báo
  };
}

