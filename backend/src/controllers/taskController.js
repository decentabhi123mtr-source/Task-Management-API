const prisma = require('../prisma');

// Helper to check if user is a member of the workspace associated with a project
const checkProjectMembership = async (userId, projectId) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspace_id: true },
  });

  if (!project) return false;

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      user_id_workspace_id: {
        user_id: userId,
        workspace_id: project.workspace_id,
      },
    },
  });

  return !!membership;
};

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

  if (!task) return null; // Task not found

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

// GET /api/projects/:id/tasks - List tasks for a project
exports.listTasks = async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  try {
    const isMember = await checkProjectMembership(userId, projectId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of the workspace for this project' });
    }

    const tasks = await prisma.task.findMany({
      where: { project_id: projectId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.json(tasks);
  } catch (error) {
    console.error('List tasks error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/projects/:id/tasks - Create task
exports.createTask = async (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;
  const { title, status, priority, due_date, assignee_id } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Task title is required' });
  }

  try {
    const isMember = await checkProjectMembership(userId, projectId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of the workspace for this project' });
    }

    // Verify assignee_id is a member of workspace if provided
    if (assignee_id) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { workspace_id: true },
      });
      const assigneeMembership = await prisma.workspaceMember.findUnique({
        where: {
          user_id_workspace_id: {
            user_id: assignee_id,
            workspace_id: project.workspace_id,
          },
        },
      });
      if (!assigneeMembership) {
        return res.status(400).json({ message: 'Assignee is not a member of this workspace' });
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        due_date: due_date || null,
        assignee_id: assignee_id || null,
        project_id: projectId,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/tasks/:id - Update task
exports.updateTask = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { title, status, priority, due_date, assignee_id } = req.body;

  try {
    const membershipResult = await checkTaskMembership(userId, taskId);
    if (membershipResult === null) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (!membershipResult) {
      return res.status(403).json({ message: 'Access denied: You are not a member of the workspace for this task' });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        title: true,
        assignee_id: true,
        project: { select: { workspace_id: true } },
      },
    });

    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify assignee_id is in workspace if provided
    if (assignee_id) {
      const assigneeMembership = await prisma.workspaceMember.findUnique({
        where: {
          user_id_workspace_id: {
            user_id: assignee_id,
            workspace_id: existingTask.project.workspace_id,
          },
        },
      });
      if (!assigneeMembership) {
        return res.status(400).json({ message: 'Assignee is not a member of this workspace' });
      }
    }

    // Prepare update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (due_date !== undefined) updateData.due_date = due_date || null;
    if (assignee_id !== undefined) updateData.assignee_id = assignee_id || null;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Trigger ASSIGNED notification if assignee_id changed and is not the actor
    if (
      assignee_id !== undefined &&
      assignee_id !== null &&
      assignee_id !== existingTask.assignee_id &&
      assignee_id !== userId
    ) {
      try {
        const actor = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });

        await prisma.notification.create({
          data: {
            user_id: assignee_id,
            type: 'ASSIGNED',
            message: `${actor.name} assigned you to '${updatedTask.title}'`,
            task_id: taskId,
          },
        });
      } catch (err) {
        console.error('Failed to create assignment notification:', err);
      }
    }

    return res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/tasks/:id - Delete task
exports.deleteTask = async (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  try {
    const membershipResult = await checkTaskMembership(userId, taskId);
    if (membershipResult === null) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (!membershipResult) {
      return res.status(403).json({ message: 'Access denied: You are not a member of the workspace for this task' });
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/tasks/overdue - Get all overdue tasks assigned to the logged-in user
exports.getOverdueTasks = async (req, res) => {
  const userId = req.user.id;

  try {
    const userTasks = await prisma.task.findMany({
      where: {
        assignee_id: userId,
        status: { not: 'DONE' },
        due_date: { not: null },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            workspace_id: true,
            workspace: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const overdueTasks = userTasks.filter((t) => {
      if (!t.due_date) return false;
      const dateOnly = t.due_date.split('T')[0];
      const parts = dateOnly.split('-');
      if (parts.length < 3) return false;

      const taskDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
      return taskDate < todayMidnight;
    });

    return res.json(overdueTasks);
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
