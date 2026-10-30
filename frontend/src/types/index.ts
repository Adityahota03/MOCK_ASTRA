export interface Profile {
  avatar_url: string;
  grade_level: string;
  institution: string;
  bio: string;
  timezone: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_staff: boolean;
  created_at: string;
  profile: Profile;
}

export interface Subject {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string;
  topics_count: number;
}

export interface Topic {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface ActiveQuestion {
  id: number;
  position: number;
  text: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  selected_index: number | null;
  is_flagged: boolean;
  time_spent_sec: number;
}

export interface ResultQuestion {
  id: number;
  position: number;
  text: string;
  options: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean | null;
  is_flagged: boolean;
  explanation: string;
  time_spent_sec: number;
}

export interface TestSessionActive {
  id: string;
  subject: Subject;
  topic_name: string;
  num_questions: number;
  duration_seconds: number;
  started_at: string;
  expires_at: string;
  server_now: string;
  remaining_seconds: number;
  status: 'in_progress' | 'submitted' | 'expired';
  questions: ActiveQuestion[];
}

export interface TestSessionResult {
  id: string;
  subject: Subject;
  topic_name: string;
  num_questions: number;
  duration_seconds: number;
  started_at: string;
  expires_at: string;
  submitted_at: string;
  status: 'in_progress' | 'submitted' | 'expired';
  score: number;
  accuracy: number;
  total_time_spent_sec: number;
  questions: ResultQuestion[];
}

export interface TestSummary {
  id: string;
  subject_name: string;
  subject_icon: string;
  topic_name: string;
  num_questions: number;
  status: string;
  score: number;
  accuracy: number;
  total_time_spent_sec: number;
  started_at: string;
  submitted_at: string;
}

export interface DashboardSummary {
  total_tests: number;
  average_accuracy: number;
  best_subject: string;
  current_streak: number;
  total_questions_solved: number;
  recent_tests: {
    id: string;
    subject: string;
    topic: string;
    score: number;
    total: number;
    accuracy: number;
    date: string;
  }[];
}

export interface DashboardTrendItem {
  test_num: number;
  id: string;
  date: string;
  accuracy: number;
  score: number;
  total: number;
  subject: string;
  topic: string;
}

export interface SubjectStat {
  subject: string;
  icon: string;
  tests_count: number;
  accuracy: number;
}

export interface WeakTopic {
  subject: string;
  topic: string;
  accuracy: number;
  attempts: number;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages_count: number;
  last_message: string | null;
}

// Admin Panel Types
export interface AdminOverview {
  total_users: number;
  new_users_7d: number;
  total_tests: number;
  tests_7d: number;
  total_questions: number;
  verified_questions: number;
  average_accuracy: number;
  total_chats: number;
  total_messages: number;
  daily_tests: { date: string; count: number }[];
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  tests_taken: number;
  average_accuracy: number;
}

export interface AdminSubject {
  id: number;
  name: string;
  slug: string;
  icon: string;
  is_active: boolean;
  topics_count: number;
  questions_count: number;
  tests_count: number;
  average_accuracy: number;
}

export interface AdminQuestion {
  id: number;
  subject: string;
  topic_name: string;
  text: string;
  difficulty: string;
  verified: boolean;
  model_name: string;
  created_at: string;
}

export interface AdminTest {
  id: string;
  user_email: string;
  subject: string;
  topic: string;
  status: string;
  score: number;
  num_questions: number;
  accuracy: number;
  started_at: string;
}
