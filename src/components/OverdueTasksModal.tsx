import React, { useState, useEffect } from 'react';
import { Task, taskApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { getDueDateBadge } from './TaskCard';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';

interface OverdueTasksModalProps {
  onClose?: () => void;
  onSelectTask?: (task: Task) => void;
}

export const OverdueTasksModal: React.FC<OverdueTasksModalProps> = ({ onClose, onSelectTask }) => {
  const navigate = useNavigate();
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dontShowToday, setDontShowToday] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user disabled popup for today
    const todayStr = new Date().toISOString().split('T')[0];
    const disabledDate = localStorage.getItem('overdue_popup_disabled_date');
    const sessionShown = sessionStorage.getItem('overdue_popup_shown');

    if (disabledDate === todayStr || sessionShown) {
      setIsLoading(false);
      return;
    }

    // Fetch overdue tasks for current user
    taskApi
      .getOverdue()
      .then((data) => {
        if (data && data.length > 0) {
          setOverdueTasks(data);
          setIsOpen(true);
          sessionStorage.setItem('overdue_popup_shown', 'true');
        }
      })
      .catch((err) => {
        console.error('Error fetching overdue tasks:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleDismiss = () => {
    if (dontShowToday) {
      const todayStr = new Date().toISOString().split('T')[0];
      localStorage.setItem('overdue_popup_disabled_date', todayStr);
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleTaskClick = (task: Task) => {
    handleDismiss();
    const project = (task as any).project;
    if (project && project.workspace_id) {
      navigate(`/workspaces/${project.workspace_id}/projects/${project.id}?search=&priority=ALL&assignee=ALL`);
    }
    if (onSelectTask) {
      onSelectTask(task);
    }
  };

  if (!isOpen || isLoading || overdueTasks.length === 0) return null;

  const displayTasks = overdueTasks.slice(0, 8);
  const hasMore = overdueTasks.length > 8;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs select-none">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-neutral-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-rose-50 border-b border-rose-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                <span>You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}</span>
              </h3>
              <p className="text-xs text-rose-600 font-medium">Assigned to you that require attention</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-100/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Overdue Task List */}
        <div className="p-4 max-h-72 overflow-y-auto divide-y divide-neutral-100">
          {displayTasks.map((t) => {
            const dueBadge = getDueDateBadge(t.due_date, t.status);
            const projectName = (t as any).project?.name || 'Project Board';

            return (
              <div
                key={t.id}
                onClick={() => handleTaskClick(t)}
                className="py-3 px-3 rounded-xl hover:bg-neutral-50 flex items-center justify-between gap-3 cursor-pointer group transition-all"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 truncate group-hover:underline">
                      {t.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        t.priority === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : t.priority === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    Board: <strong className="text-neutral-700">{projectName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {dueBadge && (
                    <div className={`flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border ${dueBadge.className}`}>
                      {dueBadge.icon}
                      <span>{dueBadge.label}</span>
                    </div>
                  )}
                  <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div className="pt-3 text-center text-xs font-semibold text-neutral-500">
              + {overdueTasks.length - 8} more overdue tasks
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="border-t border-neutral-100 bg-neutral-50 px-6 py-3.5 flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-600 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 h-3.5 w-3.5"
            />
            <span>Don't show again today</span>
          </label>

          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
