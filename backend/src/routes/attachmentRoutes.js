const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachmentController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Protect all routes
router.use(authMiddleware);

// Wrapper to catch Multer validation/limit errors and return clear JSON responses
const handleMulterUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

router.post('/tasks/:id/attachments', handleMulterUpload, attachmentController.uploadAttachment);
router.get('/tasks/:id/attachments', attachmentController.listAttachments);
router.get('/attachments/:id/download', attachmentController.downloadAttachment);
router.delete('/attachments/:id', attachmentController.deleteAttachment);
router.get('/tasks/:id/activity', attachmentController.listActivityLogs);

module.exports = router;
