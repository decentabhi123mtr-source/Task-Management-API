const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/auth');

// Protect all routes
router.use(authMiddleware);

router.get('/:id/tasks', taskController.listTasks);
router.post('/:id/tasks', taskController.createTask);

module.exports = router;
