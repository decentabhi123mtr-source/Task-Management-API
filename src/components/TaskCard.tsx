import React from 'react';
import { Task } from '../services/api';
import { Calendar, MessageSquare } from 'lucide-react';

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

export const TaskCard: React.FC<TaskCardProps> = ({ task, commentCount, onClick }) => {
  const handleDragStart = (e: React.DragEvent) => {
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
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityStyle(task.priority)}`}>
            {task.priority.toLowerCase()}
          </span>
          {task.due_date && (
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <Calendar className="h-3 w-3" />
              <span>{task.due_date}</span>
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
