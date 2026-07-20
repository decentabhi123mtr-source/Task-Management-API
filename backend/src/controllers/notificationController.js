const prisma = require('../prisma');

// GET /api/notifications - Get logged-in user's notifications
exports.listNotifications = async (req, res) => {
  const userId = req.user.id;

  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 30,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    return res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('List notifications error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/notifications/:id/read - Mark single notification as read
exports.markAsRead = async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.user_id !== userId) {
      return res.status(403).json({ message: 'Access denied: You do not own this notification' });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return res.json(updatedNotification);
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/notifications/read-all - Mark all user notifications as read
exports.markAllAsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    const updateResult = await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });

    return res.json({
      message: 'All notifications marked as read',
      count: updateResult.count,
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
