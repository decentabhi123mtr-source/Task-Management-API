const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to check if a user is a workspace member
const checkMembership = async (userId, workspaceId) => {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      user_id_workspace_id: {
        user_id: userId,
        workspace_id: workspaceId,
      },
    },
  });
  return !!membership;
};

// GET /api/workspaces/:id/projects - List projects in workspace
exports.listProjects = async (req, res) => {
  const workspaceId = req.params.id;
  const userId = req.user.id;

  try {
    const isMember = await checkMembership(userId, workspaceId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this workspace' });
    }

    const projects = await prisma.project.findMany({
      where: { workspace_id: workspaceId },
    });

    return res.json(projects);
  } catch (error) {
    console.error('List projects error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/workspaces/:id/projects - Create project in workspace
exports.createProject = async (req, res) => {
  const workspaceId = req.params.id;
  const { name } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  try {
    const isMember = await checkMembership(userId, workspaceId);
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this workspace' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        workspace_id: workspaceId,
      },
    });

    return res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
