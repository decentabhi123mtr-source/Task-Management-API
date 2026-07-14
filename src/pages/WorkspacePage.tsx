import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspaceApi, Workspace } from '../services/api';
import { Plus, LayoutGrid, Loader2, LogOut, ArrowRight, FolderOpen } from 'lucide-react';
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

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await workspaceApi.list();
      setWorkspaces(data);
    } catch (err: any) {
      console.error('Failed to load workspaces:', err);
      setError(err.response?.data?.message || 'failed to load workspaces from server');
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
        // Navigate to the first project board
        navigate(`/workspaces/${workspaceId}/projects/${projects[0].id}`);
      } else {
        // If workspace has no projects, create a default project
        const defaultProj = await workspaceApi.createProject(workspaceId, { name: 'Main Board' });
        navigate(`/workspaces/${workspaceId}/projects/${defaultProj.id}`);
      }
    } catch (err: any) {
      console.error('Failed to resolve workspace projects', err);
      setError(err.response?.data?.message || 'failed to load workspace projects');
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
      setWorkspaces((prev) => [...prev, ws]);
      setNewWorkspaceName('');
      setIsNewWorkspaceOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'failed to create workspace');
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen bg-neutral-50 flex flex-col">
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
            className="inline-flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>new workspace</span>
          </button>
        </div>

        {workspaces.length === 0 ? (
          <div className="border border-dashed border-neutral-200 bg-white rounded-xl p-12 text-center space-y-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSelectWorkspace(ws.id)}
                className="group text-left bg-white border border-neutral-200 hover:border-neutral-400 p-6 rounded-xl transition-all shadow-xs flex items-center justify-between"
              >
                <div className="space-y-1">
                  <h3 className="font-semibold text-neutral-900 text-sm group-hover:underline">
                    {ws.name.toLowerCase()}
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-mono">ID: {ws.id}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* New Workspace Modal */}
      {isNewWorkspaceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-xl border border-neutral-200 shadow-xl overflow-hidden">
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
    </div>
  );
};
