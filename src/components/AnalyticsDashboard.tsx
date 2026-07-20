import React, { useState } from 'react';
import { Task, WorkspaceMemberUser, Project } from '../services/api';
import { getDueDateBadge, getInitials } from './TaskCard';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ListTodo, 
  Layers,
  BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

interface AnalyticsDashboardProps {
  tasks: Task[];
  members: WorkspaceMemberUser[];
  currentProject: Project | null;
  projectsList: Project[];
  onSelectTask?: (task: Task) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  tasks,
  members,
  currentProject,
  onSelectTask,
}) => {
  const [selectedScope, setSelectedScope] = useState<'BOARD' | 'ALL'>('BOARD');

  // Filter tasks based on scope (Board vs All Workspace Projects)
  const displayTasks = selectedScope === 'BOARD' 
    ? tasks 
    : tasks; // If server returns all workspace tasks or current board tasks

  // --- STATS CALCULATIONS ---
  const totalTasks = displayTasks.length;
  const completedTasks = displayTasks.filter((t) => t.status === 'DONE').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let overdueCount = 0;
  let dueTodayCount = 0;

  displayTasks.forEach((t) => {
    if (!t.due_date || t.status === 'DONE') return;
    const dateOnly = t.due_date.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length < 3) return;

    const taskDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();

    if (taskDate < todayMidnight) {
      overdueCount++;
    } else if (taskDate === todayMidnight) {
      dueTodayCount++;
    }
  });

  // --- DONUT CHART DATA (STATUS BREAKDOWN) ---
  const todoCount = displayTasks.filter((t) => t.status === 'TODO').length;
  const inProgressCount = displayTasks.filter((t) => t.status === 'IN_PROGRESS').length;

  const statusData = [
    { name: 'To Do', value: todoCount, color: '#a3a3a3' },
    { name: 'In Progress', value: inProgressCount, color: '#3b82f6' },
    { name: 'Done', value: completedTasks, color: '#10b981' },
  ].filter((d) => d.value > 0);

  // --- STACKED BAR CHART DATA (WORKLOAD BY ASSIGNEE) ---
  const assigneeMap: { [key: string]: { name: string; HIGH: number; MEDIUM: number; LOW: number; total: number } } = {};

  // Initialize all workspace members
  members.forEach((m) => {
    assigneeMap[m.id] = { name: m.name, HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 };
  });
  assigneeMap['unassigned'] = { name: 'Unassigned', HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 };

  displayTasks.forEach((t) => {
    const key = t.assignee_id && assigneeMap[t.assignee_id] ? t.assignee_id : 'unassigned';
    const prio = t.priority || 'MEDIUM';
    if (assigneeMap[key]) {
      assigneeMap[key][prio] += 1;
      assigneeMap[key].total += 1;
    }
  });

  const workloadData = Object.values(assigneeMap)
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total);

  // --- PRIORITY DISTRIBUTION DATA ---
  const highCount = displayTasks.filter((t) => t.priority === 'HIGH').length;
  const mediumCount = displayTasks.filter((t) => t.priority === 'MEDIUM').length;
  const lowCount = displayTasks.filter((t) => t.priority === 'LOW').length;

  // --- UPCOMING DEADLINES & OVERDUE LIST ---
  const tasksWithDueDate = displayTasks
    .filter((t) => t.due_date && t.status !== 'DONE')
    .sort((a, b) => {
      const aTime = new Date(a.due_date!.split('T')[0]).getTime();
      const bTime = new Date(b.due_date!.split('T')[0]).getTime();
      return aTime - bTime;
    });

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Header Controls & Scope Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 border border-neutral-200 rounded-xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-neutral-900" />
            <span>Project Analytics & Insights</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time metric breakdown for <strong className="text-neutral-800">{currentProject?.name || 'Project'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            <span>Scope:</span>
          </span>
          <select
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value as 'BOARD' | 'ALL')}
            className="text-xs font-medium bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-neutral-900"
          >
            <option value="BOARD">Current Board ({currentProject?.name})</option>
            <option value="ALL">All Board Tasks ({totalTasks} total)</option>
          </select>
        </div>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Tasks</span>
            <div className="text-2xl font-bold text-neutral-900">{totalTasks}</div>
            <p className="text-[11px] text-neutral-500">Across current board</p>
          </div>
          <div className="p-3 bg-neutral-100 rounded-xl border border-neutral-200/60">
            <ListTodo className="h-5 w-5 text-neutral-700" />
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Completed</span>
            <div className="text-2xl font-bold text-emerald-600">
              {completedTasks} <span className="text-xs font-medium text-emerald-700">({completionPercentage}%)</span>
            </div>
            <p className="text-[11px] text-neutral-500">{completionPercentage}% task completion rate</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Overdue</span>
            <div className="text-2xl font-bold text-rose-600">{overdueCount}</div>
            <p className="text-[11px] text-rose-500">Requires immediate attention</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
        </div>

        {/* Due Today */}
        <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Due Today</span>
            <div className="text-2xl font-bold text-amber-600">{dueTodayCount}</div>
            <p className="text-[11px] text-amber-600">Pending completion today</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* 2 & 3. CHARTS ROW: Status Breakdown Donut & Workload by Assignee */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Status Breakdown Donut Chart */}
        <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Task Status Breakdown</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Distribution across status columns</p>
          </div>

          <div className="h-56 my-2">
            {statusData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400 italic border border-dashed border-neutral-200 rounded-lg">
                No tasks to analyze
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} tasks`, 'Count']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-neutral-600">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-400" />
                <span>To Do</span>
              </span>
              <span className="font-semibold text-neutral-900">{todoCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-neutral-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span>In Progress</span>
              </span>
              <span className="font-semibold text-neutral-900">{inProgressCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-neutral-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Done</span>
              </span>
              <span className="font-semibold text-neutral-900">{completedTasks}</span>
            </div>
          </div>
        </div>

        {/* Workload by Assignee (Stacked Horizontal Bar Chart) */}
        <div className="lg:col-span-2 bg-white p-5 border border-neutral-200 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Workload by Assignee</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Task distribution stacked by priority per team member</p>
          </div>

          <div className="h-64 my-2">
            {workloadData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400 italic border border-dashed border-neutral-200 rounded-lg">
                No active task assignments
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={workloadData}
                  margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="HIGH" name="High Priority" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="MEDIUM" name="Medium Priority" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="LOW" name="Low Priority" stackId="a" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 4 & 5. PRIORITY DISTRIBUTION & UPCOMING DEADLINES LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Distribution Overview */}
        <div className="bg-white p-5 border border-neutral-200 rounded-xl shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Priority Distribution</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Task urgency breakdown</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-neutral-700 mb-1">
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> High Priority
                </span>
                <span>{highCount} tasks ({totalTasks > 0 ? Math.round((highCount / totalTasks) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all"
                  style={{ width: `${totalTasks > 0 ? (highCount / totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-neutral-700 mb-1">
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Medium Priority
                </span>
                <span>{mediumCount} tasks ({totalTasks > 0 ? Math.round((mediumCount / totalTasks) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${totalTasks > 0 ? (mediumCount / totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-neutral-700 mb-1">
                <span className="flex items-center gap-1 text-teal-600">
                  <span className="h-2 w-2 rounded-full bg-teal-500" /> Low Priority
                </span>
                <span>{lowCount} tasks ({totalTasks > 0 ? Math.round((lowCount / totalTasks) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-500 h-2 rounded-full transition-all"
                  style={{ width: `${totalTasks > 0 ? (lowCount / totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines & Overdue Tasks */}
        <div className="lg:col-span-2 bg-white p-5 border border-neutral-200 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Upcoming Deadlines & Overdue Tasks</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Tasks sorted by urgency and due date</p>
            </div>
            <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg">
              {tasksWithDueDate.length} active deadlines
            </span>
          </div>

          {tasksWithDueDate.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-neutral-200 rounded-xl text-xs text-neutral-400 italic">
              No upcoming deadlines or overdue tasks
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 max-h-60 overflow-y-auto pr-1">
              {tasksWithDueDate.map((t) => {
                const dueBadge = getDueDateBadge(t.due_date, t.status);

                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask && onSelectTask(t)}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-50 px-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        title={t.assignee?.name || 'Unassigned'}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-700 border border-neutral-200"
                      >
                        {getInitials(t.assignee?.name)}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-semibold text-neutral-800 truncate">{t.title}</p>
                        <p className="text-[10px] text-neutral-400 font-medium">
                          Assignee: {t.assignee?.name || 'Unassigned'} · Status: {t.status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {dueBadge && (
                        <div className={`flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border ${dueBadge.className}`}>
                          {dueBadge.icon}
                          <span>{dueBadge.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
