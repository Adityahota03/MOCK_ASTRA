import axios from 'axios';
import type {
  User,
  Subject,
  Topic,
  TestSessionActive,
  TestSessionResult,
  TestSummary,
  DashboardSummary,
  DashboardTrendItem,
  SubjectStat,
  WeakTopic,
  ChatConversation,
  ChatMessage,
  AdminOverview,
  AdminUser,
  AdminSubject,
  AdminQuestion,
  AdminTest,
} from '../types';

const backendUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const apiBaseUrl = backendUrl ? `${backendUrl}/api` : '/api';

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh access token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${apiBaseUrl}/auth/refresh/`, { refresh: refreshToken });
          const newAccess = res.data.access;
          localStorage.setItem('access_token', newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.dispatchEvent(new Event('auth:expired'));
        }
      }
    }
    return Promise.reject(error);
  }
);

// Typed API services
export const catalogApi = {
  getSubjects: async (): Promise<Subject[]> => {
    const res = await api.get<Subject[]>('/subjects/');
    return res.data;
  },
  getTopics: async (subjectId: number, search?: string): Promise<Topic[]> => {
    const res = await api.get<Topic[]>(`/subjects/${subjectId}/topics/`, {
      params: search ? { search } : undefined,
    });
    return res.data;
  },
};

export const testsApi = {
  generateTest: async (subjectId: number, topic: string, count: number): Promise<string> => {
    const res = await api.post<{ session_id: string }>('/tests/generate/', {
      subject_id: subjectId,
      topic,
      count,
    });
    return res.data.session_id;
  },
  getActiveTest: async (sessionId: string): Promise<TestSessionActive> => {
    const res = await api.get<TestSessionActive>(`/tests/${sessionId}/`);
    return res.data;
  },
  autosaveAnswers: async (
    sessionId: string,
    answers: { position: number; selected_index: number | null; is_flagged: boolean; time_spent_sec: number }[]
  ): Promise<void> => {
    await api.patch(`/tests/${sessionId}/answers/`, { answers });
  },
  submitTest: async (
    sessionId: string,
    answers: { position: number; selected_index: number | null }[]
  ): Promise<TestSessionResult> => {
    const res = await api.post<TestSessionResult>(`/tests/${sessionId}/submit/`, { answers });
    return res.data;
  },
  getResult: async (sessionId: string): Promise<TestSessionResult> => {
    const res = await api.get<TestSessionResult>(`/tests/${sessionId}/result/`);
    return res.data;
  },
  getTestHistory: async (): Promise<TestSummary[]> => {
    const res = await api.get<TestSummary[]>('/tests/');
    return res.data;
  },
};

export const analyticsApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const res = await api.get<DashboardSummary>('/dashboard/summary/');
    return res.data;
  },
  getTrend: async (): Promise<DashboardTrendItem[]> => {
    const res = await api.get<DashboardTrendItem[]>('/dashboard/trend/');
    return res.data;
  },
  getSubjectsStats: async (): Promise<{ subjects: SubjectStat[]; weak_topics: WeakTopic[] }> => {
    const res = await api.get<{ subjects: SubjectStat[]; weak_topics: WeakTopic[] }>('/dashboard/subjects/');
    return res.data;
  },
};

export const chatApi = {
  getConversations: async (): Promise<ChatConversation[]> => {
    const res = await api.get<ChatConversation[]>('/chat/conversations/');
    return res.data;
  },
  createConversation: async (title?: string): Promise<ChatConversation> => {
    const res = await api.post<ChatConversation>('/chat/conversations/', { title });
    return res.data;
  },
  getMessages: async (conversationId: string): Promise<ChatMessage[]> => {
    const res = await api.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages/`);
    return res.data;
  },
  sendMessage: async (conversationId: string, content: string): Promise<{ user_message: ChatMessage; assistant_message: ChatMessage }> => {
    const res = await api.post(`/chat/conversations/${conversationId}/messages/`, { content });
    return res.data;
  },
};

export const accountsApi = {
  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/me/');
    return res.data;
  },
  updateProfile: async (data: { full_name?: string; profile?: Partial<User['profile']> }): Promise<User> => {
    const res = await api.patch<User>('/me/', data);
    return res.data;
  },
  changePassword: async (old_password: string, new_password: string): Promise<void> => {
    await api.post('/me/password/change/', { old_password, new_password });
  },
};

export const adminApi = {
  getOverview: async (): Promise<AdminOverview> => {
    const res = await api.get<AdminOverview>('/admin-panel/overview/');
    return res.data;
  },
  getUsers: async (): Promise<AdminUser[]> => {
    const res = await api.get<AdminUser[]>('/admin-panel/users/');
    return res.data;
  },
  toggleUser: async (userId: number, isActive: boolean): Promise<void> => {
    await api.patch('/admin-panel/users/', { user_id: userId, is_active: isActive });
  },
  getSubjects: async (): Promise<AdminSubject[]> => {
    const res = await api.get<AdminSubject[]>('/admin-panel/subjects/');
    return res.data;
  },
  createSubject: async (name: string, icon: string, description: string): Promise<void> => {
    await api.post('/admin-panel/subjects/', { name, icon, description });
  },
  toggleSubject: async (subjectId: number, isActive: boolean): Promise<void> => {
    await api.patch('/admin-panel/subjects/', { subject_id: subjectId, is_active: isActive });
  },
  getQuestions: async (subjectId?: number): Promise<AdminQuestion[]> => {
    const res = await api.get<AdminQuestion[]>('/admin-panel/questions/', {
      params: subjectId ? { subject_id: subjectId } : undefined,
    });
    return res.data;
  },
  deleteQuestion: async (questionId: number): Promise<void> => {
    await api.delete('/admin-panel/questions/', { data: { question_id: questionId } });
  },
  getTests: async (): Promise<AdminTest[]> => {
    const res = await api.get<AdminTest[]>('/admin-panel/tests/');
    return res.data;
  },
};
