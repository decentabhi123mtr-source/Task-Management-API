const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const authMiddleware = require('../middleware/auth');

// Protect all routes
router.use(authMiddleware);

router.patch('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Comments inside tasks
router.get('/:id/comments', commentController.listComments);
router.post('/:id/comments', commentController.addComment);

module.exports = router;
