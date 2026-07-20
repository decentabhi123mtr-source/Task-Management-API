const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/auth');

// Protect all routes
router.use(authMiddleware);

router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.listWorkspaces);
router.patch('/:id', workspaceController.updateWorkspace);
router.delete('/:id/leave', workspaceController.leaveWorkspace);
router.post('/:id/invite', workspaceController.inviteMember);
router.patch('/:id/members/:userId', workspaceController.changeMemberRole);

// Projects inside workspaces
router.get('/:id/projects', projectController.listProjects);
router.post('/:id/projects', projectController.createProject);

// Members in workspace
router.get('/:id/members', workspaceController.listMembers);

module.exports = router;

