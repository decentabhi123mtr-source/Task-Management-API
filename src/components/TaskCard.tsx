import React from 'react';
import { Task } from '../services/api';
import { Calendar, MessageSquare, Clock, AlertTriangle } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  commentCount: number;
  onClick: () => void;
}

export const getInitials = (name?: string): string => {
  if (!name) return 'UN';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getDueDateBadge = (dueDateStr?: string, status?: string) => {
  if (!dueDateStr || status === 'DONE') return null;

  // Extract YYYY-MM-DD parts to calculate in local timezone
  const dateOnly = dueDateStr.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length < 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed month
  const day = parseInt(parts[2], 10);

  const dueDate = new Date(year, month, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: 'Overdue',
      className: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: <AlertTriangle className="h-3 w-3 shrink-0 text-rose-600" />,
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Due Today',
      className: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: <Clock className="h-3 w-3 shrink-0 text-amber-600" />,
    };
  }
  if (diffDays === 1) {
    return {
      label: '1 day left',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Calendar className="h-3 w-3 shrink-0 text-blue-500" />,
    };
  }
  return {
    label: `${diffDays} days left`,
    className: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    icon: <Calendar className="h-3 w-3 shrink-0 text-neutral-400" />,
  };
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, commentCount, onClick }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const getPriorityStyle = (priority: Task['priority']) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'LOW':
        return 'bg-teal-50 text-teal-700 border border-teal-200';
      default:
        return 'bg-neutral-100 text-neutral-700 border border-neutral-200';
    }
  };

  const dueBadge = getDueDateBadge(task.due_date, task.status);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="bg-white p-4 border border-neutral-200 rounded-lg cursor-grab active:cursor-grabbing hover:border-neutral-400 transition-colors space-y-3 shadow-xs select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-neutral-900 leading-snug line-clamp-2">
          {task.title}
        </h4>
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityStyle(task.priority)}`}>
            {task.priority.toLowerCase()}
          </span>

          {dueBadge && (
            <div className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${dueBadge.className}`}>
              {dueBadge.icon}
              <span>{dueBadge.label}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {commentCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <MessageSquare className="h-3 w-3" />
              <span>{commentCount}</span>
            </div>
          )}

          <div
            title={task.assignee?.name || 'Unassigned'}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-700 border border-neutral-200"
          >
            {getInitials(task.assignee?.name)}
          </div>
        </div>
      </div>
    </div>
  );
};
