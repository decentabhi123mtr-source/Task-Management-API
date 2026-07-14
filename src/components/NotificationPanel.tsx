import React from 'react';
import { Notification } from '../services/api';
import { Bell, Check, Loader2 } from 'lucide-react';

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectTask: (taskId: string) => void;
}

export const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  unreadCount,
  isLoading,
  onMarkRead,
  onMarkAllRead,
  onSelectTask,
}) => {
  return (
    <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 flex flex-col max-h-[400px] overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-neutral-800" />
          <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">notifications</span>
          {unreadCount > 0 && (
            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-[10px] font-bold text-neutral-600 hover:text-neutral-900 underline focus:outline-none"
          >
            mark all as read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center p-8 gap-2 text-xs text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
            <span className="text-xs font-medium text-neutral-500">no notifications yet</span>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                onMarkRead(notif.id);
                if (notif.task_id) {
                  onSelectTask(notif.task_id);
                }
              }}
              className={`px-4 py-3 text-left transition-colors cursor-pointer text-xs flex gap-2 ${
                notif.is_read
                  ? 'bg-white hover:bg-neutral-50'
                  : 'bg-rose-50/20 hover:bg-rose-50/30 border-l-2 border-rose-500'
              }`}
            >
              <div className="flex-1 space-y-1">
                <p className="text-neutral-800 font-medium leading-normal">{notif.message}</p>
                <p className="text-[10px] text-neutral-400 font-medium">
                  {formatRelativeTime(notif.created_at)}
                </p>
              </div>
              {!notif.is_read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(notif.id);
                  }}
                  title="Mark as read"
                  className="text-neutral-300 hover:text-neutral-600 self-start p-0.5 rounded-md"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
