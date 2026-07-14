import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  workspaceApi,
  projectApi,
  taskApi,
  Workspace,
  Project,
  Task,
  Comment,
  WorkspaceMemberUser,
} from '../services/api';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { NotificationBell } from '../components/NotificationBell';
import { Plus, Users, ArrowLeft, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BoardPage: React.FC = () => {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // State
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberUser[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskComments, setSelectedTaskComments] = useState<Comment[]>([]);
  
  // Loading & View States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  // Form States
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('MEDIUM');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [newProjectName, setNewProjectName] = useState('');

  // Fetch Data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!workspaceId || !projectId) return;

      // 1. Fetch workspaces and find current workspace
      const workspaces = await workspaceApi.list();
      const ws = workspaces.find((w) => w.id === workspaceId) || null;
      setCurrentWorkspace(ws);

      // 2. Fetch projects in this workspace
      const projs = await workspaceApi.getProjects(workspaceId);
      setProjectsList(projs);
      const proj = projs.find((p) => p.id === projectId) || null;
      setCurrentProject(proj);

      // 3. Fetch workspace members
      const workspaceMembers = await workspaceApi.getMembers(workspaceId);
      setMembers(workspaceMembers);

      // 4. Fetch tasks in this project
      const t = await projectApi.getTasks(projectId);
      setTasks(t);
    } catch (err: any) {
      console.error('API loading error on BoardPage:', err);
      setError(err.response?.data?.message || 'failed to load project board from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspaceId, projectId]);

  // Fetch comments when a task is selected
  useEffect(() => {
    const fetchComments = async () => {
      if (!selectedTask) {
        setSelectedTaskComments([]);
        return;
      }
      try {
        const comments = await taskApi.getComments(selectedTask.id);
        setSelectedTaskComments(comments);
      } catch (err) {
        console.error('Failed to load task comments:', err);
      }
    };
    fetchComments();
  }, [selectedTask]);

  // Drag and Drop Logic
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Optimistically update status locally
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );

    try {
      await taskApi.update(taskId, { status });
    } catch (err) {
      console.error('Failed to update task status in API', err);
      // Revert on failure
      const t = await projectApi.getTasks(projectId || '');
      setTasks(t);
    }
  };

  // Create Task Logic
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !projectId) return;

    const taskData: Partial<Task> = {
      title: newTaskTitle,
      status: 'TODO',
      priority: newTaskPriority,
      assignee_id: newTaskAssigneeId || undefined,
      due_date: newTaskDueDate || undefined,
    };

    try {
      const createdTask = await projectApi.createTask(projectId, taskData);
      setTasks((prev) => [...prev, createdTask]);

      // Reset Form
      setNewTaskTitle('');
      setNewTaskPriority('MEDIUM');
      setNewTaskAssigneeId('');
      setNewTaskDueDate('');
      setIsNewTaskOpen(false);
    } catch (err: any) {
      console.error('Failed to create task', err);
      alert(err.response?.data?.message || 'failed to create task');
    }
  };

  // Task Details update/delete/comment helpers
  const handleUpdateTaskInModal = async (fields: Partial<Task>) => {
    if (!selectedTask) return;

    // Optimistically update locally
    const updatedTask = {
      ...selectedTask,
      ...fields,
      assignee: fields.hasOwnProperty('assignee_id')
        ? members.find((m) => m.id === fields.assignee_id)
        : selectedTask.assignee,
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === selectedTask.id ? updatedTask : t))
    );
    setSelectedTask(updatedTask);

    try {
      await taskApi.update(selectedTask.id, fields);
    } catch (err: any) {
      console.error('Failed to update task detail in API', err);
      alert(err.response?.data?.message || 'failed to update task');
    }
  };

  const handleDeleteTaskInModal = async () => {
    if (!selectedTask) return;

    // Optimistically delete locally
    setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));

    try {
      await taskApi.delete(selectedTask.id);
    } catch (err: any) {
      console.error('Failed to delete task in API', err);
      alert(err.response?.data?.message || 'failed to delete task');
      // Revert
      const t = await projectApi.getTasks(projectId || '');
      setTasks(t);
    }
  };

  const handleAddCommentInModal = async (body: string) => {
    if (!selectedTask) return;

    try {
      const comment = await taskApi.addComment(selectedTask.id, { body });
      setSelectedTaskComments((prev) => [...prev, comment]);
    } catch (err: any) {
      console.error('Failed to post comment to API', err);
      throw err;
    }
  };

  // Workspace Invite logic
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !workspaceId) return;

    try {
      await workspaceApi.invite(workspaceId, { email: inviteEmail, role: inviteRole });
      alert(`successfully sent workspace invitation to ${inviteEmail}`);
      setInviteEmail('');
      setIsInviteOpen(false);
      // Reload members list
      const workspaceMembers = await workspaceApi.getMembers(workspaceId);
      setMembers(workspaceMembers);
    } catch (err: any) {
      console.error('Failed to invite member', err);
      alert(err.response?.data?.message || 'failed to invite member');
    }
  };

  // Create Project logic
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !workspaceId) return;

    try {
      const newProj = await workspaceApi.createProject(workspaceId, { name: newProjectName });
      setProjectsList((prev) => [...prev, newProj]);
      navigate(`/workspaces/${workspaceId}/projects/${newProj.id}`);
      setNewProjectName('');
      setIsNewProjectOpen(false);
    } catch (err: any) {
      console.error('Failed to create project', err);
      alert(err.response?.data?.message || 'failed to create project');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-600" />
        <span className="text-sm font-medium text-neutral-600">loading board...</span>
      </div>
    );
  }

  // Filter tasks into columns using uppercase database enums
  const todoTasks = tasks.filter((t) => t.status === 'TODO');
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter((t) => t.status === 'DONE');

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header bar */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        {/* Workspace and Project breadcrumbs */}
        <div className="flex items-center gap-3">
          <Link
            to="/workspaces"
            className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>workspaces</span>
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-500 text-sm font-semibold">{currentWorkspace?.name}</span>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-900 text-sm font-bold">{currentProject?.name}</span>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-3">
          <NotificationBell
            onSelectTask={async (taskId) => {
              try {
                let foundTask = tasks.find((t) => t.id === taskId);
                if (!foundTask) {
                  if (projectId) {
                    const projectTasks = await projectApi.getTasks(projectId);
                    setTasks(projectTasks);
                    foundTask = projectTasks.find((t) => t.id === taskId);
                  }
                }
                if (foundTask) {
                  setSelectedTask(foundTask);
                }
              } catch (err) {
                console.error('Error selecting task from notification:', err);
              }
            }}
          />

          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 text-xs font-semibold px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all bg-white"
          >
            <Users className="h-3.5 w-3.5" />
            <span>invite member</span>
          </button>
          
          <button
            onClick={() => setIsNewTaskOpen(true)}
            className="inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>new task</span>
          </button>

          <div className="h-6 w-px bg-neutral-200" />

          <button
            onClick={logout}
            className="text-neutral-600 hover:text-neutral-900 text-xs font-semibold transition-colors"
          >
            sign out
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-150">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-neutral-200 p-6 flex flex-col justify-between hidden md:flex">
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">projects</h3>
              <div className="space-y-1">
                {projectsList.map((p) => (
                  <Link
                    key={p.id}
                    to={`/workspaces/${workspaceId}/projects/${p.id}`}
                    className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                      p.id === projectId
                        ? 'bg-neutral-100 text-neutral-950 font-semibold'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    }`}
                  >
                    {p.name.toLowerCase()}
                  </Link>
                ))}
              </div>
              <button
                onClick={() => setIsNewProjectOpen(true)}
                className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900 text-xs font-medium pt-2 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>add project</span>
              </button>
            </div>
          </div>
          
          <div className="border-t border-neutral-100 pt-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
              {user ? user.name.slice(0, 2).toUpperCase() : 'ME'}
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900 leading-none">{user?.name || 'anonymous user'}</p>
              <p className="text-[10px] text-neutral-400 mt-1">{user?.email || 'demo@example.com'}</p>
            </div>
          </div>
        </aside>

        {/* Board content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-start">
            
            {/* COLUMN: To Do */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'TODO')}
              className="bg-neutral-100/50 border border-neutral-200/60 rounded-xl p-4 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  to do
                  <span className="bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5 text-[10px] font-bold">
                    {todoTasks.length}
                  </span>
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto flex-1 pb-10">
                {todoTasks.length === 0 ? (
                  <div className="border border-dashed border-neutral-200 rounded-lg p-6 text-center text-xs text-neutral-400 italic">
                    no tasks in this column
                  </div>
                ) : (
                  todoTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      commentCount={0} // Displays comments conditionally in modal
                      onClick={() => setSelectedTask(t)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN: In Progress */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'IN_PROGRESS')}
              className="bg-neutral-100/50 border border-neutral-200/60 rounded-xl p-4 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  in progress
                  <span className="bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5 text-[10px] font-bold">
                    {inProgressTasks.length}
                  </span>
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto flex-1 pb-10">
                {inProgressTasks.length === 0 ? (
                  <div className="border border-dashed border-neutral-200 rounded-lg p-6 text-center text-xs text-neutral-400 italic">
                    no tasks in this column
                  </div>
                ) : (
                  inProgressTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      commentCount={0}
                      onClick={() => setSelectedTask(t)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* COLUMN: Done */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'DONE')}
              className="bg-neutral-100/50 border border-neutral-200/60 rounded-xl p-4 flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  done
                  <span className="bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5 text-[10px] font-bold">
                    {doneTasks.length}
                  </span>
                </span>
              </div>
              <div className="space-y-3 overflow-y-auto flex-1 pb-10">
                {doneTasks.length === 0 ? (
                  <div className="border border-dashed border-neutral-200 rounded-lg p-6 text-center text-xs text-neutral-400 italic">
                    no tasks in this column
                  </div>
                ) : (
                  doneTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      commentCount={0}
                      onClick={() => setSelectedTask(t)}
                    />
                  ))
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* --- MODALS --- */}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          comments={selectedTaskComments}
          members={members}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTaskInModal}
          onDelete={handleDeleteTaskInModal}
          onAddComment={handleAddCommentInModal}
        />
      )}

      {/* New Task Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-xl border border-neutral-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">new task</h3>
              <button onClick={() => setIsNewTaskOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. implement user routes"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                    className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-900"
                  >
                    <option value="HIGH">high</option>
                    <option value="MEDIUM">medium</option>
                    <option value="LOW">low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">due date</label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">assignee</label>
                <select
                  value={newTaskAssigneeId}
                  onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-900"
                >
                  <option value="">unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold"
                >
                  create task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-xl border border-neutral-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">invite team member</h3>
              <button onClick={() => setIsInviteOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleInviteMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">email address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-neutral-900"
                >
                  <option value="MEMBER">member</option>
                  <option value="ADMIN">admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold"
                >
                  send invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {isNewProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-xl border border-neutral-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">add new project</h3>
              <button onClick={() => setIsNewProjectOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">project name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Application"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold"
                >
                  create project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
