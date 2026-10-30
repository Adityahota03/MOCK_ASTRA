import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../../lib/api';
import type { AdminOverview, AdminUser, AdminSubject, AdminQuestion, AdminTest } from '../../types';
import {
  BarChart3, Users, BookOpen, Brain, MessageSquare,
  TrendingUp, Shield, ToggleLeft, ToggleRight, Trash2,
  Plus, Activity, ClipboardList,
  ArrowLeft, RefreshCw, Search
} from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'subjects' | 'questions' | 'tests';

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  const loadData = async (tab: AdminTab) => {
    setLoading(true);
    try {
      switch (tab) {
        case 'overview':
          setOverview(await adminApi.getOverview());
          break;
        case 'users':
          setUsers(await adminApi.getUsers());
          break;
        case 'subjects':
          setSubjects(await adminApi.getSubjects());
          break;
        case 'questions':
          setQuestions(await adminApi.getQuestions());
          break;
        case 'tests':
          setTests(await adminApi.getTests());
          break;
      }
    } catch (err) {
      console.error('Admin data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = async (userId: number, currentActive: boolean) => {
    await adminApi.toggleUser(userId, !currentActive);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentActive } : u));
  };

  const handleToggleSubject = async (subjectId: number, currentActive: boolean) => {
    await adminApi.toggleSubject(subjectId, !currentActive);
    setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, is_active: !currentActive } : s));
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    await adminApi.deleteQuestion(questionId);
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const tabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { key: 'subjects', label: 'Subjects', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'questions', label: 'Questions', icon: <Brain className="w-4 h-4" /> },
    { key: 'tests', label: 'Tests', icon: <ClipboardList className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#060913]">
      <div className="ambient-bg" />

      {/* Admin Header */}
      <header className="sticky top-0 z-30 px-6 py-4 backdrop-blur-xl bg-[#060913]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="p-2 rounded-xl bg-amber-600/20 border border-amber-400/30 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.3)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                ASTRA <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">ADMIN</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Platform Management Console</p>
            </div>
          </div>

          <button
            onClick={() => loadData(activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">
        {/* Tab Navigation */}
        <div className="flex gap-1.5 p-1 mb-6 glass-panel rounded-2xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-amber-600/80 to-orange-600/80 text-white shadow-lg shadow-amber-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {activeTab === 'overview' && overview && <OverviewPanel data={overview} />}
                {activeTab === 'users' && <UsersPanel users={users} onToggle={handleToggleUser} search={searchQuery} onSearch={setSearchQuery} />}
                {activeTab === 'subjects' && <SubjectsPanel subjects={subjects} onToggle={handleToggleSubject} onRefresh={() => loadData('subjects')} />}
                {activeTab === 'questions' && <QuestionsPanel questions={questions} onDelete={handleDeleteQuestion} search={searchQuery} onSearch={setSearchQuery} />}
                {activeTab === 'tests' && <TestsPanel tests={tests} search={searchQuery} onSearch={setSearchQuery} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ──────────────────────────────────── Overview Panel ──────────────────────────────────── */

function OverviewPanel({ data }: { data: AdminOverview }) {
  const statCards = [
    { label: 'Total Users', value: data.total_users, sub: `+${data.new_users_7d} this week`, icon: <Users className="w-5 h-5" />, color: 'from-blue-500 to-cyan-500' },
    { label: 'Tests Completed', value: data.total_tests, sub: `+${data.tests_7d} this week`, icon: <ClipboardList className="w-5 h-5" />, color: 'from-emerald-500 to-green-500' },
    { label: 'Questions Bank', value: data.total_questions, sub: `${data.verified_questions} verified`, icon: <Brain className="w-5 h-5" />, color: 'from-purple-500 to-violet-500' },
    { label: 'Avg Accuracy', value: `${data.average_accuracy}%`, sub: 'Platform-wide', icon: <TrendingUp className="w-5 h-5" />, color: 'from-amber-500 to-orange-500' },
    { label: 'AI Chats', value: data.total_chats, sub: `${data.total_messages} messages`, icon: <MessageSquare className="w-5 h-5" />, color: 'from-pink-500 to-rose-500' },
  ];

  const maxDaily = Math.max(...data.daily_tests.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel rounded-2xl p-4 hover:border-white/15 transition-all"
          >
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-3 shadow-lg`}>
              {card.icon}
            </div>
            <div className="text-2xl font-extrabold text-white">{card.value}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">{card.label}</div>
            <div className="text-[10px] text-slate-500 mt-1">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Daily Tests Bar Chart */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" /> Tests Activity (Last 7 Days)
        </h3>
        <div className="flex items-end gap-2 h-32">
          {data.daily_tests.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-semibold">{day.count}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((day.count / maxDaily) * 100, 4)}%` }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="w-full rounded-t-lg bg-gradient-to-t from-amber-600 to-amber-400 min-h-[3px]"
              />
              <span className="text-[9px] text-slate-500 font-medium">{day.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────── Users Panel ──────────────────────────────────── */

function UsersPanel({ users, onToggle, search, onSearch }: {
  users: AdminUser[];
  onToggle: (id: number, active: boolean) => void;
  search: string;
  onSearch: (q: string) => void;
}) {
  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" /> Registered Students ({users.length})
        </h2>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-56"
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 font-semibold">
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-center px-4 py-3">Tests</th>
                <th className="text-center px-4 py-3">Avg Accuracy</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-center px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{user.email}</td>
                  <td className="px-4 py-3 text-slate-300">{user.full_name || '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{user.tests_taken}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      user.average_accuracy >= 70 ? 'bg-emerald-500/15 text-emerald-400' :
                      user.average_accuracy >= 40 ? 'bg-amber-500/15 text-amber-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      {user.average_accuracy}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{user.created_at}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onToggle(user.id, user.is_active)}
                      className="cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors"
                      title={user.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {user.is_active
                        ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                        : <ToggleLeft className="w-5 h-5 text-slate-500" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────── Subjects Panel ──────────────────────────────────── */

function SubjectsPanel({ subjects, onToggle, onRefresh }: {
  subjects: AdminSubject[];
  onToggle: (id: number, active: boolean) => void;
  onRefresh: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('book');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await adminApi.createSubject(newName.trim(), newIcon.trim(), newDesc.trim());
      setNewName('');
      setNewIcon('book');
      setNewDesc('');
      setShowCreate(false);
      onRefresh();
    } catch {
      alert('Failed to create subject');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-400" /> Subjects ({subjects.length})
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold border border-amber-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Subject
        </button>
      </div>

      {/* Create Subject Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-panel rounded-2xl p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Subject name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              <input
                type="text"
                placeholder="Icon name (e.g. calculator)"
                value={newIcon}
                onChange={e => setNewIcon(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              <input
                type="text"
                placeholder="Description"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="glass-button px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              {creating ? 'Creating...' : 'Create Subject'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((subj, i) => (
          <motion.div
            key={subj.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`glass-panel rounded-2xl p-4 transition-all ${!subj.is_active ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{subj.name}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{subj.slug}</p>
              </div>
              <button
                onClick={() => onToggle(subj.id, subj.is_active)}
                className="cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors"
                title={subj.is_active ? 'Deactivate' : 'Activate'}
              >
                {subj.is_active
                  ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                  : <ToggleLeft className="w-5 h-5 text-slate-500" />
                }
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-sm font-bold text-white">{subj.topics_count}</div>
                <div className="text-[9px] text-slate-500">Topics</div>
              </div>
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-sm font-bold text-white">{subj.questions_count}</div>
                <div className="text-[9px] text-slate-500">Questions</div>
              </div>
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-sm font-bold text-white">{subj.tests_count}</div>
                <div className="text-[9px] text-slate-500">Tests</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Avg Accuracy: <span className="text-amber-400 font-bold">{subj.average_accuracy}%</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────── Questions Panel ──────────────────────────────────── */

function QuestionsPanel({ questions, onDelete, search, onSearch }: {
  questions: AdminQuestion[];
  onDelete: (id: number) => void;
  search: string;
  onSearch: (q: string) => void;
}) {
  const filtered = questions.filter(q =>
    q.text.toLowerCase().includes(search.toLowerCase()) ||
    q.topic_name.toLowerCase().includes(search.toLowerCase()) ||
    q.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" /> Question Bank ({questions.length})
        </h2>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-56"
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 font-semibold">
                <th className="text-left px-4 py-3">Subject</th>
                <th className="text-left px-4 py-3">Topic</th>
                <th className="text-left px-4 py-3 max-w-xs">Question</th>
                <th className="text-center px-4 py-3">Difficulty</th>
                <th className="text-center px-4 py-3">Verified</th>
                <th className="text-left px-4 py-3">Model</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-amber-300 font-medium">{q.subject}</td>
                  <td className="px-4 py-3 text-slate-300">{q.topic_name}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={q.text}>{q.text}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      q.difficulty === 'easy' ? 'bg-emerald-500/15 text-emerald-400' :
                      q.difficulty === 'medium' ? 'bg-amber-500/15 text-amber-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {q.verified
                      ? <span className="text-emerald-400 font-bold">Yes</span>
                      : <span className="text-red-400 font-bold">No</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[10px]">{q.model_name}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onDelete(q.id)}
                      className="cursor-pointer p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/70 hover:text-red-400 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No questions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────── Tests Panel ──────────────────────────────────── */

function TestsPanel({ tests, search, onSearch }: {
  tests: AdminTest[];
  search: string;
  onSearch: (q: string) => void;
}) {
  const filtered = tests.filter(t =>
    t.user_email.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.topic.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-emerald-400" /> Test Sessions ({tests.length})
        </h2>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tests..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-56"
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 font-semibold">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Subject</th>
                <th className="text-left px-4 py-3">Topic</th>
                <th className="text-center px-4 py-3">Score</th>
                <th className="text-center px-4 py-3">Accuracy</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{t.user_email}</td>
                  <td className="px-4 py-3 text-amber-300">{t.subject}</td>
                  <td className="px-4 py-3 text-slate-300">{t.topic}</td>
                  <td className="px-4 py-3 text-center text-white font-bold">{t.score}/{t.num_questions}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.accuracy >= 70 ? 'bg-emerald-500/15 text-emerald-400' :
                      t.accuracy >= 40 ? 'bg-amber-500/15 text-amber-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      {t.accuracy}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'submitted' ? 'bg-emerald-500/15 text-emerald-400' :
                      t.status === 'expired' ? 'bg-red-500/15 text-red-400' :
                      'bg-blue-500/15 text-blue-400'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{t.started_at}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No tests found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
