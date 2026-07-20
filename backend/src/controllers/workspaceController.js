const bcrypt = require('bcryptjs');
const prisma = require('../prisma');

// POST /api/workspaces - Create workspace
exports.createWorkspace = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ message: 'Workspace name is required' });
  }

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name,
        owner_id: userId,
        members: {
          create: {
            user_id: userId,
            role: 'OWNER',
          },
        },
      },
    });

    return res.status(201).json(workspace);
  } catch (error) {
    console.error('Create workspace error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/workspaces - List workspaces user belongs to
exports.listWorkspaces = async (req, res) => {
  const userId = req.user.id;

  try {
    // Find workspaces where user is in members list
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            user_id: userId,
          },
        },
      },
    });

    return res.json(workspaces);
  } catch (error) {
    console.error('List workspaces error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/workspaces/:id/invite - Invite user by email
exports.inviteMember = async (req, res) => {
  const workspaceId = req.params.id;
  const { email, role } = req.body;
  const requesterId = req.user.id;

  if (!email) {
    return res.status(400).json({ message: 'User email is required' });
  }

  try {
    // Check if requester is member of this workspace
    const requesterMembership = await prisma.workspaceMember.findUnique({
      where: {
        user_id_workspace_id: {
          user_id: requesterId,
          workspace_id: workspaceId,
        },
      },
    });

    if (!requesterMembership) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this workspace' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if target user exists; if not, create account for them
    let targetUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!targetUser) {
      const name = normalizedEmail.split('@')[0];
      const hashedPassword = await bcrypt.hash('password123', 10);
      targetUser = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          password_hash: hashedPassword,
        },
      });
    }

    // Check if target user is already in the workspace
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        user_id_workspace_id: {
          user_id: targetUser.id,
          workspace_id: workspaceId,
        },
      },
    });

    if (existingMembership) {
      return res.status(409).json({ message: 'User is already a member of this workspace' });
    }

    // Create member mapping
    const membership = await prisma.workspaceMember.create({
      data: {
        user_id: targetUser.id,
        workspace_id: workspaceId,
        role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      },
    });

    return res.status(201).json(membership);
  } catch (error) {
    console.error('Invite member error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/workspaces/:id/members/:userId - Change member role
exports.changeMemberRole = async (req, res) => {
  const workspaceId = req.params.id;
  const targetUserId = req.params.userId;
  const { role } = req.body;
  const requesterId = req.user.id;

  if (!role || !['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
    return res.status(400).json({ message: 'Valid role is required (OWNER, ADMIN, MEMBER)' });
  }

  try {
    // Verify requester role in the workspace (must be OWNER or ADMIN)
    const requesterMembership = await prisma.workspaceMember.findUnique({
      where: {
        user_id_workspace_id: {
          user_id: requesterId,
          workspace_id: workspaceId,
        },
      },
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return res.status(403).json({ message: 'Access denied: Only owners and admins can change member roles' });
    }

    // Verify target user is in the workspace
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: {
        user_id_workspace_id: {
          user_id: targetUserId,
          workspace_id: workspaceId,
        },
      },
    });

    if (!targetMembership) {
      return res.status(404).json({ message: 'Target user is not a member of this workspace' });
    }

    // Perform the role update
    const updatedMembership = await prisma.workspaceMember.update({
      where: {
        user_id_workspace_id: {
          user_id: targetUserId,
          workspace_id: workspaceId,
        },
      },
      data: { role },
    });

    // If changing to OWNER, also update workspace owner_id
    if (role === 'OWNER') {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { owner_id: targetUserId },
      });
    }

    return res.json(updatedMembership);
  } catch (error) {
    console.error('Change member role error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/workspaces/:id/members - List members in a workspace
exports.listMembers = async (req, res) => {
  const workspaceId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if requester is a workspace member
    const requesterMembership = await prisma.workspaceMember.findUnique({
      where: {
        user_id_workspace_id: {
          user_id: userId,
          workspace_id: workspaceId,
        },
      },
    });

    if (!requesterMembership) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this workspace' });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspace_id: workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.json(
      members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      }))
    );
  } catch (error) {
    console.error('List members error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

