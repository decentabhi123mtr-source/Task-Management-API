import axios from 'axios';

let authToken: string | null = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface WorkspaceMemberUser extends User {
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER';
  projectsCount?: number;
  membersCount?: number;
  members?: { id: string; name: string; email: string; role: string }[];
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
}

export interface Task {
  id: string;
  project_id: string;
  assignee_id?: string;
  assignee?: User;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  due_date?: string;
  created_at?: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user?: User;
  body: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'ASSIGNED' | 'MENTIONED' | 'COMMENTED';
  message: string;
  task_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  uploaded_by: string;
  uploader?: User;
  file_name: string;
  stored_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  user?: { name: string };
  message: string;
  created_at: string;
}

export const authApi = {
  register: (data: { name: string; email: string; password?: string }) => 
    api.post<{ token: string; user: User }>('/auth/register', data).then(res => res.data),
  login: (data: { email: string; password?: string }) => 
    api.post<{ token: string; user: User }>('/auth/login', data).then(res => res.data),
  resetPassword: (data: { email: string; newPassword?: string }) => 
    api.post<{ message: string }>('/auth/reset-password', data).then(res => res.data),
};

export const workspaceApi = {
  list: () => api.get<Workspace[]>('/workspaces').then(res => res.data),
  create: (data: { name: string }) => api.post<Workspace>('/workspaces', data).then(res => res.data),
  rename: (workspaceId: string, data: { name: string }) => 
    api.patch<Workspace>(`/workspaces/${workspaceId}`, data).then(res => res.data),
  leave: (workspaceId: string) => 
    api.delete<{ message: string }>(`/workspaces/${workspaceId}/leave`).then(res => res.data),
  invite: (workspaceId: string, data: { email: string; role: string }) => 
    api.post(`/workspaces/${workspaceId}/invite`, data).then(res => res.data),
  getProjects: (workspaceId: string) => 
    api.get<Project[]>(`/workspaces/${workspaceId}/projects`).then(res => res.data),
  createProject: (workspaceId: string, data: { name: string }) => 
    api.post<Project>(`/workspaces/${workspaceId}/projects`, data).then(res => res.data),
  getMembers: (workspaceId: string) =>
    api.get<WorkspaceMemberUser[]>(`/workspaces/${workspaceId}/members`).then(res => res.data),
};

export const projectApi = {
  getTasks: (projectId: string) => 
    api.get<Task[]>(`/projects/${projectId}/tasks`).then(res => res.data),
  createTask: (projectId: string, data: Partial<Task>) => 
    api.post<Task>(`/projects/${projectId}/tasks`, data).then(res => res.data),
};

export const taskApi = {
  update: (taskId: string, data: Partial<Task>) => 
    api.patch<Task>(`/tasks/${taskId}`, data).then(res => res.data),
  delete: (taskId: string) => 
    api.delete(`/tasks/${taskId}`).then(res => res.data),
  getComments: (taskId: string) => 
    api.get<Comment[]>(`/tasks/${taskId}/comments`).then(res => res.data),
  addComment: (taskId: string, data: { body: string }) => 
    api.post<Comment>(`/tasks/${taskId}/comments`, data).then(res => res.data),
};

export const notificationApi = {
  list: () => 
    api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications').then(res => res.data),
  markAsRead: (id: string) => 
    api.patch<Notification>(`/notifications/${id}/read`).then(res => res.data),
  markAllAsRead: () => 
    api.patch<{ message: string; count: number }>('/notifications/read-all').then(res => res.data),
};

export const attachmentApi = {
  list: (taskId: string) => 
    api.get<Attachment[]>(`/tasks/${taskId}/attachments`).then(res => res.data),
  upload: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Attachment>(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  download: (attachmentId: string) => 
    api.get<Blob>(`/attachments/${attachmentId}/download`, { responseType: 'blob' }).then(res => res.data),
  delete: (attachmentId: string) => 
    api.delete(`/attachments/${attachmentId}`).then(res => res.data),
  listActivity: (taskId: string) => 
    api.get<ActivityLog[]>(`/tasks/${taskId}/activity`).then(res => res.data),
};

export default api;
