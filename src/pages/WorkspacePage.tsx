import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { workspaceApi, Workspace } from '../services/api';
import { getInitials } from '../components/TaskCard';
import { 
  Plus, 
  LayoutGrid, 
  Loader2, 
  LogOut, 
  ArrowRight, 
  FolderOpen, 
  Copy, 
  Check, 
  MoreVertical, 
  Edit3, 
  UserMinus, 
  Users 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewWorkspaceOpen, setIsNewWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kebab Menu & Rename States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [renameWorkspaceId, setRenameWorkspaceId] = useState<string | null>(null);
  const [renameWorkspaceName, setRenameWorkspaceName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await workspaceApi.list();
      setWorkspaces(data);
    } catch (err: any) {
      console.error('Failed to load workspaces:', err);
      const msg = err.response?.data?.message || 'failed to load workspaces from server';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleSelectWorkspace = async (workspaceId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const projects = await workspaceApi.getProjects(workspaceId);

      if (projects.length > 0) {
        navigate(`/workspaces/${workspaceId}/projects/${projects[0].id}`);
      } else {
        const defaultProj = await workspaceApi.createProject(workspaceId, { name: 'Main Board' });
        navigate(`/workspaces/${workspaceId}/projects/${defaultProj.id}`);
      }
    } catch (err: any) {
      console.error('Failed to resolve workspace projects', err);
      const msg = err.response?.data?.message || 'failed to load workspace projects';
      setError(msg);
      toast.error(msg);
      setIsLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const ws = await workspaceApi.create({ name: newWorkspaceName });
      toast.success(`Workspace '${ws.name}' created`);
      setNewWorkspaceName('');
      setIsNewWorkspaceOpen(false);
      fetchWorkspaces();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'failed to create workspace';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('Workspace ID copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameWorkspaceId || !renameWorkspaceName.trim()) return;
    setIsRenaming(true);

    try {
      const updated = await workspaceApi.rename(renameWorkspaceId, { name: renameWorkspaceName });
      toast.success(`Workspace renamed to '${updated.name}'`);
      setWorkspaces((prev) => prev.map((w) => (w.id === renameWorkspaceId ? { ...w, name: updated.name } : w)));
      setRenameWorkspaceId(null);
      setRenameWorkspaceName('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to rename workspace';
      toast.error(msg);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleLeaveWorkspace = async (e: React.MouseEvent, ws: Workspace) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!window.confirm(`Are you sure you want to leave '${ws.name}'?`)) return;

    try {
      await workspaceApi.leave(ws.id);
      toast.success(`Left workspace '${ws.name}'`);
      setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to leave workspace';
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-600" />
        <span className="text-sm font-medium text-neutral-600">loading workspaces...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col select-none">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-neutral-900" />
          <span className="text-sm font-bold tracking-tight text-neutral-900">workspace switcher</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-500 font-medium">signed in as {user?.email}</span>
          <button
            onClick={logout}
            className="text-neutral-500 hover:text-neutral-950 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>sign out</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-150">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">your workspaces</h2>
            <p className="text-sm text-neutral-500 mt-1">select a workspace to view your project boards or create a new one</p>
          </div>
          <button
            onClick={() => setIsNewWorkspaceOpen(true)}
            className="inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>new workspace</span>
          </button>
        </div>

        {workspaces.length === 0 ? (
          <div className="border border-dashed border-neutral-200 bg-white rounded-2xl p-12 text-center space-y-4">
            <FolderOpen className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-500">no workspaces found yet</p>
            <button
              onClick={() => setIsNewWorkspaceOpen(true)}
              className="text-xs font-semibold text-neutral-900 underline hover:text-neutral-700"
            >
              create your first workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {workspaces.map((ws) => {
              const role = ws.role || 'MEMBER';
              const membersList = ws.members || [];
              const visibleMembers = membersList.slice(0, 3);
              const extraMembersCount = membersList.length - visibleMembers.length;

              return (
                <div
                  key={ws.id}
                  onClick={() => handleSelectWorkspace(ws.id)}
                  className="group relative bg-white border border-neutral-200 hover:border-neutral-400 p-6 rounded-2xl transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4"
                >
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-neutral-900 text-base group-hover:text-neutral-950 transition-colors">
                          {ws.name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            role === 'OWNER'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : role === 'ADMIN'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                          }`}
                        >
                          {role}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                        <span>ID: {ws.id.slice(0, 8)}...</span>
                        <button
                          type="button"
                          title="Copy Workspace ID"
                          onClick={(e) => handleCopyId(e, ws.id)}
                          className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                        >
                          {copiedId === ws.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </p>
                    </div>

                    {/* Kebab Action Menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === ws.id ? null : ws.id)}
                        className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800 transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {activeMenuId === ws.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                          <div className="absolute right-0 mt-1 w-44 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 py-1 text-xs">
                            {['OWNER', 'ADMIN'].includes(role) && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setRenameWorkspaceId(ws.id);
                                  setRenameWorkspaceName(ws.name);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 font-medium"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-neutral-500" />
                                <span>Rename Workspace</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => handleCopyId(e, ws.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 font-medium"
                            >
                              <Copy className="h-3.5 w-3.5 text-neutral-500" />
                              <span>Copy ID</span>
                            </button>

                            {role !== 'OWNER' && (
                              <button
                                onClick={(e) => handleLeaveWorkspace(e, ws)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 font-medium"
                              >
                                <UserMinus className="h-3.5 w-3.5 text-rose-500" />
                                <span>Leave Workspace</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom Stats & Stacked Member Avatars */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-semibold text-neutral-500">
                      <span className="flex items-center gap-1.5">
                        <LayoutGrid className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{ws.projectsCount || 0} Boards</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{ws.membersCount || membersList.length || 1} Members</span>
                      </span>
                    </div>

                    {/* Stacked Member Avatars */}
                    <div className="flex items-center -space-x-1.5">
                      {visibleMembers.map((m) => (
                        <div
                          key={m.id}
                          title={m.name}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[9px] font-bold text-neutral-700 border-2 border-white ring-1 ring-neutral-200/60"
                        >
                          {getInitials(m.name)}
                        </div>
                      ))}
                      {extraMembersCount > 0 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-[9px] font-bold text-white border-2 border-white">
                          +{extraMembersCount}
                        </div>
                      )}
                      <div className="ml-2 pl-1">
                        <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-950 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Workspace Modal */}
      {isNewWorkspaceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-neutral-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">new workspace</h3>
              <button onClick={() => setIsNewWorkspaceOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <Plus className="h-4 w-4 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">workspace name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewWorkspaceOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold disabled:bg-neutral-400"
                >
                  {isSubmitting ? 'creating...' : 'create workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Workspace Modal */}
      {renameWorkspaceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-neutral-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">rename workspace</h3>
              <button onClick={() => setRenameWorkspaceId(null)} className="text-neutral-400 hover:text-neutral-600">
                <Plus className="h-4 w-4 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">new workspace name</label>
                <input
                  type="text"
                  required
                  value={renameWorkspaceName}
                  onChange={(e) => setRenameWorkspaceName(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRenameWorkspaceId(null)}
                  className="px-4 py-2 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenaming}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold disabled:bg-neutral-400"
                >
                  {isRenaming ? 'saving...' : 'save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
