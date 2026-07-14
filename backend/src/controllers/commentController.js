const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to check membership via a taskId
const checkTaskMembership = async (userId, taskId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      project: {
        select: { workspace_id: true },
      },
    },
  });

  if (!task) return null;

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      user_id_workspace_id: {
        user_id: userId,
        workspace_id: task.project.workspace_id,
      },
    },
  });

  return !!membership;
};

// Reusable function to notify task conversation participants when a new comment is posted
const notifyTaskParticipants = async (taskId, commenterId, commenterName, commentBody) => {
  try {
    const taskInfo = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        title: true,
        assignee_id: true,
        project: {
          select: {
            workspace: {
              select: {
                members: {
                  include: {
                    user: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!taskInfo) return;

    // Collect initial recipients list
    const recipients = new Set();

    // 1. Task assignee (if one is set)
    if (taskInfo.assignee_id) {
      recipients.add(taskInfo.assignee_id);
    }

    // 2. Every user who has previously commented on this task
    const previousComments = await prisma.comment.findMany({
      where: { task_id: taskId },
      select: { user_id: true },
    });

    for (const comment of previousComments) {
      recipients.add(comment.user_id);
    }

    // 3. ALWAYS exclude the commenter
    recipients.delete(commenterId);

    // 4. Parse mentions of format @[Name]
    const matches = [...commentBody.matchAll(/@\[([^\]]+)\]/g)].map((m) => m[1]);
    const workspaceMembers = taskInfo.project.workspace.members;
    const mentionedUsers = [];

    for (const name of matches) {
      const member = workspaceMembers.find(
        (m) => m.user.name.toLowerCase() === name.toLowerCase()
      );
      if (member && member.user_id !== commenterId) {
        mentionedUsers.push(member.user_id);
      }
    }

    const notificationsData = [];

    // Dispatch MENTIONED for explicitly tagged, and COMMENTED for general participants
    for (const targetUserId of recipients) {
      if (mentionedUsers.includes(targetUserId)) {
        notificationsData.push({
          user_id: targetUserId,
          type: 'MENTIONED',
          message: `${commenterName} mentioned you in '${taskInfo.title}'`,
          task_id: taskId,
        });
      } else {
        notificationsData.push({
          user_id: targetUserId,
          type: 'COMMENTED',
          message: `${commenterName} commented on '${taskInfo.title}'`,
          task_id: taskId,
        });
      }
    }

    // Include mentioned users who are not already general participants
    for (const targetUserId of mentionedUsers) {
      if (!recipients.has(targetUserId)) {
        notificationsData.push({
          user_id: targetUserId,
          type: 'MENTIONED',
          message: `${commenterName} mentioned you in '${taskInfo.title}'`,
          task_id: taskId,
        });
      }
    }

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData,
      });
    }
  } catch (error) {
    console.error('Failed to notify task participants:', error);
  }
};

// GET /api/tasks/:id/comments - List comments for a task
exports.listComments = async (req, res) => {
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

    const comments = await prisma.comment.findMany({
      where: { task_id: taskId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return res.json(comments);
  } catch (error) {
    console.error('List comments error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/tasks/:id/comments - Add comment
exports.addComment = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { body } = req.body;

  if (!body) {
    return res.status(400).json({ message: 'Comment body is required' });
  }

  try {
    const isMember = await checkTaskMembership(userId, taskId);
    if (isMember === null) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of the workspace for this task' });
    }

    const comment = await prisma.comment.create({
      data: {
        body,
        task_id: taskId,
        user_id: userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Dispatch notifications in background to participants and mentioned users
    notifyTaskParticipants(taskId, userId, comment.user.name, body);

    return res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
