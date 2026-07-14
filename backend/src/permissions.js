/**
 * Helper utilities for role and owner based permissions checking.
 */

/**
 * Checks if a user has permission to delete an attachment.
 * Allowed if the user is the original uploader, or has OWNER or ADMIN role in the workspace.
 * 
 * @param {string} userRole - OWNER, ADMIN, or MEMBER
 * @param {object} attachment - The attachment database row
 * @param {string} userId - The requesting user ID
 * @returns {boolean}
 */
const canDeleteAttachment = (userRole, attachment, userId) => {
  if (!attachment) return false;
  return attachment.uploaded_by === userId || ['OWNER', 'ADMIN'].includes(userRole);
};

module.exports = {
  canDeleteAttachment
};
