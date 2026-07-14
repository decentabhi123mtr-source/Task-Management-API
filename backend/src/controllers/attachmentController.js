const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const { canDeleteAttachment } = require('../permissions');

// Helper to check task membership
const checkTaskMembership = async (userId, taskId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      project: {
        select: { workspace_id: true }
      }
    }
  });

  if (!task) return null;

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      user_id_workspace_id: {
        user_id: userId,
        workspace_id: task.project.workspace_id
      }
    }
  });

  return !!membership;
};

// POST /api/tasks/:id/attachments - Upload attachment
exports.uploadAttachment = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or file rejected by validation rules' });
  }

  try {
    const isMember = await checkTaskMembership(userId, taskId);
    if (isMember === null) {
      // Clean up uploaded file since task doesn't exist
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Task not found' });
    }
    if (!isMember) {
      // Clean up uploaded file since user is not authorized
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Access denied: You are not a member of the workspace for this task' });
    }

    const attachment = await prisma.attachment.create({
      data: {
        task_id: taskId,
        uploaded_by: userId,
        file_name: req.file.originalname,
        stored_name: req.file.filename,
        file_size: req.file.size,
        mime_type: req.file.mimetype
      },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Create ActivityLog entry
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    await prisma.activityLog.create({
      data: {
        task_id: taskId,
        user_id: userId,
        message: `${actor.name} attached ${attachment.file_name}`
      }
    });

    return res.status(201).json(attachment);
  } catch (error) {
    console.error('Upload attachment error:', error);
    // Cleanup on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Failed to delete temp file:', err);
      }
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/tasks/:id/attachments - List task attachments
exports.listAttachments = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  try {
    const isMember = await checkTaskMembership(userId, taskId);
    if (isMember === null) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of the workspace for this task' });
    }

    const attachments = await prisma.attachment.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: 'desc' },
      include: {
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.json(attachments);
  } catch (error) {
    console.error('List attachments error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/attachments/:id/download - Stream/Download attachment file
exports.downloadAttachment = async (req, res) => {
  const attachmentId = req.params.id;
  const userId = req.user.id;

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          select: {
            project: {
              select: { workspace_id: true }
            }
          }
        }
      }
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Verify membership in workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        user_id_workspace_id: {
          user_id: userId,
          workspace_id: attachment.task.project.workspace_id
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this workspace' });
    }

    const filePath = path.join(__dirname, '../../uploads', attachment.stored_name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Physical file not found on disk' });
    }

    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.file_name)}"`);
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Download attachment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/attachments/:id - Delete attachment
exports.deleteAttachment = async (req, res) => {
  const attachmentId = req.params.id;
  const userId = req.user.id;

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          select: {
            project: {
              select: { workspace_id: true }
            }
          }
        }
      }
    });

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Fetch user role in the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        user_id_workspace_id: {
          user_id: userId,
          workspace_id: attachment.task.project.workspace_id
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this workspace' });
    }

    // Check permission rules using permissions.js helper
    if (!canDeleteAttachment(membership.role, attachment, userId)) {
      return res.status(403).json({ message: 'Access denied: You do not have permission to delete this attachment' });
    }

    // Delete DB row
    await prisma.attachment.delete({
      where: { id: attachmentId }
    });

    // Delete file from disk
    const filePath = path.join(__dirname, '../../uploads', attachment.stored_name);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Failed to delete physical file from disk:', err);
      }
    }

    // Create ActivityLog entry for removal
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    await prisma.activityLog.create({
      data: {
        task_id: attachment.task_id,
        user_id: userId,
        message: `${actor.name} removed ${attachment.file_name}`
      }
    });

    return res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/tasks/:id/activity - List task activity logs
exports.listActivityLogs = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  try {
    const isMember = await checkTaskMembership(userId, taskId);
    if (isMember === null) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of the workspace for this task' });
    }

    const logs = await prisma.activityLog.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    return res.json(logs);
  } catch (error) {
    console.error('List activity logs error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
