import { useState, useEffect } from 'react';
import { useAuthStore } from './lib/authStore';
import { AuthModal } from './features/auth/AuthModal';
import { DashboardView } from './features/dashboard/DashboardView';
import { TestWizard } from './features/wizard/TestWizard';
import { ActiveTestView } from './features/test/ActiveTestView';
import { TestResultView } from './features/results/TestResultView';
import { TestHistoryView } from './features/history/TestHistoryView';
import { ChatDrawer } from './features/chat/ChatDrawer';
import { ProfileModal } from './features/profile/ProfileModal';
import { AdminPanel } from './features/admin/AdminPanel';
import { FloatingDock, type NavTab } from './components/ui/FloatingDock';
import { Sparkles, Bot, Shield } from 'lucide-react';

export function App() {
  const { isAuthenticated, isLoading, loadUser, logout, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeTestSessionId, setActiveTestSessionId] = useState<string | null>(null);
  const [viewResultSessionId, setViewResultSessionId] = useState<string | null>(null);
  const [wizardPrefill, setWizardPrefill] = useState<{ subjectId?: number; topic?: string }>({});
  const [tutorDoubt, setTutorDoubt] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Loading state
  if (isLoading) {
    return (
      <div className="app-shell min-h-screen bg-[#060913] flex items-center justify-center">
        <div className="ambient-bg" />
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-400">Initializing Astra AI...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show spatial AuthModal
  if (!isAuthenticated) {
    return (
      <div className="app-shell min-h-screen bg-[#060913]">
        <div className="ambient-bg" />
        <AuthModal />
      </div>
    );
  }

  // Admin Panel (dedicated full page)
  if (showAdmin && user?.is_staff) {
    return <AdminPanel onBack={() => setShowAdmin(false)} />;
  }

  // Active Test taking mode (Dock is hidden to ensure full exam focus)
  if (activeTestSessionId) {
    return (
      <div className="app-shell min-h-screen bg-[#060913]">
        <div className="ambient-bg" />
        <ActiveTestView
          sessionId={activeTestSessionId}
          onSubmitted={(sessionId) => {
            setActiveTestSessionId(null);
            setViewResultSessionId(sessionId);
          }}
          onExit={() => {
            setActiveTestSessionId(null);
            setActiveTab('dashboard');
          }}
        />
      </div>
    );
  }

  // Test Results View mode
  if (viewResultSessionId) {
    return (
      <div className="app-shell min-h-screen bg-[#060913]">
        <div className="ambient-bg" />
        <TestResultView
          sessionId={viewResultSessionId}
          onRetake={(subjectId, topicName) => {
            setViewResultSessionId(null);
            setWizardPrefill({ subjectId, topic: topicName });
            setActiveTab('wizard');
          }}
          onAskTutor={(questionText, options, explanation) => {
            setViewResultSessionId(null);
            const prompt = `I need help understanding this question:\n"${questionText}"\n\nOptions:\n${options.map((o, i) => `${String.fromCharCode(65+i)}: ${o}`).join('\n')}\n\nExplanation given: "${explanation}"\n\nCould you please explain the underlying concept in intuitive, step-by-step detail?`;
            setTutorDoubt(prompt);
            setActiveTab('tutor');
          }}
          onGoDashboard={() => {
            setViewResultSessionId(null);
            setActiveTab('dashboard');
          }}
        />
        <FloatingDock
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setViewResultSessionId(null);
            setActiveTab(tab);
          }}
          onLogout={logout}
          userName={user?.full_name}
        />
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-between">
      <div className="ambient-bg" />

      {/* Top Header */}
      <header className="app-header sticky top-0 z-30 px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-xl bg-[#060913]/70 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-400/30 text-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.3)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              ASTRA <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-bold border border-indigo-500/30">AI MOCK</span>
            </span>
            <p className="app-tagline text-[10px] text-slate-400 font-medium">Intelligent Examination Mastery</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Admin Panel Button - only for staff */}
          {user?.is_staff && (
            <button
              onClick={() => setShowAdmin(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/25 transition-all cursor-pointer shadow-sm"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Admin Panel</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('tutor')}
            aria-label="Ask AI Tutor"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/25 transition-all cursor-pointer shadow-sm"
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Ask AI Tutor</span>
          </button>

          <button
            type="button"
            aria-label="Open profile"
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 pl-3 py-1 pr-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-colors"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white leading-tight">
                {user?.full_name || user?.email.split('@')[0]}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                {user?.is_staff ? 'Admin' : (user?.profile?.grade_level || 'Student')}
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
              {(user?.full_name || user?.email || 'A')[0].toUpperCase()}
            </div>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1">
        {activeTab === 'dashboard' && (
          <DashboardView
            onStartNewTest={(subjId, topic) => {
              setWizardPrefill({ subjectId: subjId, topic });
              setActiveTab('wizard');
            }}
            onViewResult={(sessionId) => setViewResultSessionId(sessionId)}
          />
        )}

        {activeTab === 'wizard' && (
          <TestWizard
            preselectedSubjectId={wizardPrefill.subjectId}
            preselectedTopic={wizardPrefill.topic}
            onTestStarted={(sessionId) => {
              setActiveTestSessionId(sessionId);
            }}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'history' && (
          <TestHistoryView
            onViewResult={(sessionId) => setViewResultSessionId(sessionId)}
            onStartNewTest={() => setActiveTab('wizard')}
          />
        )}

        {activeTab === 'tutor' && (
          <ChatDrawer
            initialDoubt={tutorDoubt}
            onClose={() => {
              setTutorDoubt(null);
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'profile' && <ProfileModal />}
      </main>

      {/* Floating Spatial Dock Navigation */}
      <FloatingDock
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setTutorDoubt(null);
          setActiveTab(tab);
        }}
        onLogout={logout}
        userName={user?.full_name}
      />
    </div>
  );
}

export default App;
