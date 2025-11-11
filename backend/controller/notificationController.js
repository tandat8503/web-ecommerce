import prisma from "../config/prisma.js";
import logger from '../utils/logger.js';
//lấy danh sách thông báo của đơn hàng mới
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      items: notifications,//danh sách thông báo
      total: notifications.length //tổng số lượng thông báo
    });
  } catch (error) {
    logger.error('Failed to get notifications', { error: error.message });
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
//đếm số lượng thông báo chưa đọc
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false //chưa đọc
      }
    });

    return res.json({ count });
  } catch (error) {
    logger.error('Failed to get unread count', { error: error.message });
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
//đánh dấu thông báo là đã đọc
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;//lấy id của user
    const id = Number(req.params.id);//lấy id của thông báo
//tìm thông báo trong database
    const notification = await prisma.notification.findFirst({
      where: { id, userId }//tìm thông báo trong database
    });
//nếu không tìm thấy thông báo trả về lỗi 404
    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại' });
    }
//cập nhật thông báo là đã đọc
    const updated = await prisma.notification.update({
      where: { id },//tìm thông báo trong database
      data: { isRead: true }//cập nhật thông báo là đã đọc
    });

    return res.json({ message: 'Đã đánh dấu đã đọc', notification: updated });
  } catch (error) {
    logger.error('Failed to mark notification as read', { error: error.message });
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
//đánh dấu tất cả thông báo là đã đọc
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    });

    return res.json({ message: 'Đã đánh dấu tất cả là đã đọc' });
  } catch (error) {
    logger.error('Failed to mark all as read', { error: error.message });
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
//xóa thông báo
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Thông báo không tồn tại' });
    }

    if (!notification.isRead) {
      return res.status(400).json({ 
        message: 'Chỉ có thể xóa thông báo đã đọc. Vui lòng đánh dấu đã đọc trước khi xóa.' 
      });
    }

    await prisma.notification.delete({
      where: { id }
    });

    return res.json({ message: 'Đã xóa thông báo' });
  } catch (error) {
    logger.error('Failed to delete notification', { error: error.message });
    return res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

