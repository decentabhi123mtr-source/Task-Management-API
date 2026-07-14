import React, { useState, useEffect } from 'react';
import { Task, Comment, attachmentApi, Attachment, ActivityLog, WorkspaceMemberUser } from '../services/api';
import { X, Calendar, User as UserIcon, AlertCircle, MessageSquare, Trash2, Paperclip, History } from 'lucide-react';
import { getInitials } from './TaskCard';
import { useAuth } from '../context/AuthContext';
import { AttachmentUploader } from './AttachmentUploader';
import { AttachmentList } from './AttachmentList';
import { formatRelativeTime } from './NotificationPanel';

interface TaskDetailModalProps {
  task: Task;
  comments: Comment[];
  members: WorkspaceMemberUser[];
  onClose: () => void;
  onUpdate: (updatedFields: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddComment: (body: string) => Promise<void>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  comments,
  members,
  onClose,
  onUpdate,
  onDelete,
  onAddComment,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [priority, setPriority] = useState<Task['priority']>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || '');
  const [status, setStatus] = useState<Task['status']>(task.status);
  const [commentBody, setCommentBody] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Find logged-in user role in this workspace mapping
  const currentUserMember = members.find((m) => m.id === user?.id);
  const currentUserRole = currentUserMember?.role || 'MEMBER';

  const fetchAttachments = async () => {
    try {
      const data = await attachmentApi.list(task.id);
      setAttachments(data);
    } catch (err) {
      console.error('Failed to fetch attachments:', err);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const data = await attachmentApi.listActivity(task.id);
      setActivityLogs(data);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    }
  };

  useEffect(() => {
    fetchAttachments();
    fetchActivityLogs();
  }, [task.id]);

  const handleFieldChange = async (fields: Partial<Task>) => {
    setError(null);
    setIsUpdating(true);
    try {
      await onUpdate(fields);
    } catch (err: any) {
      setError('failed to update task');
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setError(null);
    setIsSubmittingComment(true);
    try {
      await onAddComment(commentBody);
      setCommentBody('');
    } catch (err: any) {
      setError('failed to add comment');
      console.error(err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setError(null);
    setIsUpdating(true);
    try {
      await onDelete();
      onClose();
    } catch (err: any) {
      setError('failed to delete task');
      console.error(err);
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-xl border border-neutral-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">task detail</span>
            {isUpdating && <span className="text-xs text-neutral-400">Saving...</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              title="Delete task"
              className="text-neutral-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title Edit */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title.trim() && title !== task.title) {
                  handleFieldChange({ title });
                }
              }}
              className="w-full text-lg font-semibold text-neutral-900 border-b border-transparent hover:border-neutral-200 focus:border-neutral-900 focus:outline-none py-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Selector */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">status</label>
              <select
                value={status}
                onChange={(e) => {
                  const val = e.target.value as Task['status'];
                  setStatus(val);
                  handleFieldChange({ status: val });
                }}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-900"
              >
                <option value="TODO">to do</option>
                <option value="IN_PROGRESS">in progress</option>
                <option value="DONE">done</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">priority</label>
              <select
                value={priority}
                onChange={(e) => {
                  const val = e.target.value as Task['priority'];
                  setPriority(val);
                  handleFieldChange({ priority: val });
                }}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-900"
              >
                <option value="HIGH">high</option>
                <option value="MEDIUM">medium</option>
                <option value="LOW">low</option>
              </select>
            </div>

            {/* Assignee Picker */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">assignee</label>
              <div className="relative">
                <select
                  value={assigneeId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssigneeId(val);
                    handleFieldChange({ assignee_id: val || undefined });
                  }}
                  className="w-full text-sm border border-neutral-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:border-neutral-900 appearance-none"
                >
                  <option value="">unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* Due Date Picker */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">due date</label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDueDate(val);
                    handleFieldChange({ due_date: val || undefined });
                  }}
                  className="w-full text-sm border border-neutral-200 rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:border-neutral-900"
                />
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <hr className="border-neutral-100" />

          {/* Attachments Section */}
          <div className="space-y-4">
            <h5 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider text-xs text-neutral-500 font-bold">
              <Paperclip className="h-4 w-4" />
              <span>attachments</span>
            </h5>
            <AttachmentUploader
              taskId={task.id}
              onUploadSuccess={(newAttachment) => {
                setAttachments((prev) => [newAttachment, ...prev]);
                fetchActivityLogs();
              }}
            />
            <AttachmentList
              attachments={attachments}
              userRole={currentUserRole}
              currentUserId={user?.id || ''}
              onDeleteSuccess={(attachmentId) => {
                setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
                fetchActivityLogs();
              }}
            />
          </div>

          <hr className="border-neutral-100" />

          {/* Activity Log Section */}
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5 uppercase tracking-wider text-xs text-neutral-500 font-bold">
              <History className="h-4 w-4" />
              <span>activity log</span>
            </h5>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">no activity logged yet</p>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="text-xs text-neutral-600 flex justify-between gap-2 py-0.5">
                    <span className="font-medium text-neutral-700">{log.message}</span>
                    <span className="text-[10px] text-neutral-400 shrink-0 font-medium">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <hr className="border-neutral-100" />

          {/* Comments Section */}
          <div className="space-y-4">
            <h5 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span>comments</span>
            </h5>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="flex gap-3 relative">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="add a comment..."
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-900"
                />

                {(() => {
                  const lastAtIndex = commentBody.lastIndexOf('@');
                  const showSuggestions = lastAtIndex !== -1 && lastAtIndex >= commentBody.lastIndexOf(' ');
                  if (!showSuggestions) return null;

                  const query = commentBody.slice(lastAtIndex + 1);
                  const suggestedMembers = members.filter((m) =>
                    m.name.toLowerCase().includes(query.toLowerCase())
                  );

                  if (suggestedMembers.length === 0) return null;

                  return (
                    <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-neutral-200 rounded-lg shadow-md z-50 max-h-36 overflow-y-auto divide-y divide-neutral-100">
                      {suggestedMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            const beforeAt = commentBody.slice(0, lastAtIndex);
                            setCommentBody(`${beforeAt}@[${m.name}] `);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 transition-colors flex items-center justify-between text-neutral-700"
                        >
                          <span className="font-medium">{m.name.toLowerCase()}</span>
                          <span className="text-[10px] text-neutral-400">{m.email}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <button
                type="submit"
                disabled={isSubmittingComment || !commentBody.trim()}
                className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                {isSubmittingComment ? 'posting...' : 'post'}
              </button>
            </form>

            {/* Comment List */}
            <div className="space-y-3 pt-2">
              {comments.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 text-sm">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-700 border border-neutral-200">
                      {getInitials(comment.user?.name)}
                    </div>
                    <div className="flex-1 bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-neutral-800 text-xs">
                          {comment.user?.name || 'Unknown user'}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-neutral-600 text-xs whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
