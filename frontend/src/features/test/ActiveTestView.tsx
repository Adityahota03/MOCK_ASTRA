import React, { useState, useEffect, useRef, useCallback } from 'react';
import { testsApi } from '../../lib/api';
import type { TestSessionActive, ActiveQuestion } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { TimerRing } from '../../components/ui/TimerRing';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  AlertCircle,
  HelpCircle,
  Save,
  Send,
} from 'lucide-react';

interface ActiveTestViewProps {
  sessionId: string;
  onSubmitted: (sessionId: string) => void;
  onExit: () => void;
}

export const ActiveTestView: React.FC<ActiveTestViewProps> = ({
  sessionId,
  onSubmitted,
  onExit,
}) => {
  const [session, setSession] = useState<TestSessionActive | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(1800);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number | null>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [timeSpentMap, setTimeSpentMap] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('Synced');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const questionStartTimeRef = useRef<number>(Date.now());
  const autosaveTimeoutRef = useRef<any>(null);

  // Load test session
  useEffect(() => {
    testsApi.getActiveTest(sessionId)
      .then((data) => {
        setSession(data);
        setRemainingSec(data.remaining_seconds);

        // Prepopulate answers & flags from server
        const ans: Record<number, number | null> = {};
        const flags: Record<number, boolean> = {};
        const times: Record<number, number> = {};

        data.questions.forEach((q) => {
          ans[q.position] = q.selected_index;
          flags[q.position] = q.is_flagged;
          times[q.position] = q.time_spent_sec;
        });

        setSelectedAnswers(ans);
        setFlaggedQuestions(flags);
        setTimeSpentMap(times);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load test session.');
        setLoading(false);
      });
  }, [sessionId]);

  // Submit test handler
  const handleSubmitTest = useCallback(async () => {
    if (isSubmitting || !session) return;
    setIsSubmitting(true);

    try {
      const answersPayload = session.questions.map((q) => ({
        position: q.position,
        selected_index: selectedAnswers[q.position] ?? null,
      }));

      await testsApi.submitTest(sessionId, answersPayload);
      onSubmitted(sessionId);
    } catch (err: any) {
      setIsSubmitting(false);
      alert('Error submitting test: ' + (err.response?.data?.detail || err.message));
    }
  }, [isSubmitting, session, selectedAnswers, sessionId, onSubmitted]);

  // Authoritative countdown timer loop
  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;

    const interval = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session, handleSubmitTest]);

  // Autosave answers to backend
  const triggerAutosave = useCallback(() => {
    if (!session) return;
    setSaveStatus('Saving...');

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = session.questions.map((q) => ({
          position: q.position,
          selected_index: selectedAnswers[q.position] ?? null,
          is_flagged: !!flaggedQuestions[q.position],
          time_spent_sec: timeSpentMap[q.position] || 0,
        }));

        await testsApi.autosaveAnswers(sessionId, payload);
        setSaveStatus('Autosaved');
      } catch {
        setSaveStatus('Offline (Cached)');
      }
    }, 1200);
  }, [session, selectedAnswers, flaggedQuestions, timeSpentMap, sessionId]);

  // Track time spent per question on switch
  const switchQuestion = (nextIdx: number) => {
    if (!session) return;
    const now = Date.now();
    const elapsedSec = Math.max(1, Math.round((now - questionStartTimeRef.current) / 1000));
    const currentQ = session.questions[currentIdx];

    if (currentQ) {
      setTimeSpentMap((prev) => ({
        ...prev,
        [currentQ.position]: (prev[currentQ.position] || 0) + elapsedSec,
      }));
    }

    questionStartTimeRef.current = now;
    setCurrentIdx(nextIdx);
    triggerAutosave();
  };

  const handleSelectOption = (optIdx: number) => {
    if (!session) return;
    const currentQ = session.questions[currentIdx];
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.position]: optIdx,
    }));
    triggerAutosave();
  };

  const handleToggleFlag = () => {
    if (!session) return;
    const currentQ = session.questions[currentIdx];
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQ.position]: !prev[currentQ.position],
    }));
    triggerAutosave();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading test environment...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 glass-panel text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Unable to Load Test</h3>
        <p className="text-sm text-slate-400 mb-6">{error || 'Session not found.'}</p>
        <button
          onClick={onExit}
          className="px-6 py-2.5 rounded-xl glass-button text-white text-sm font-semibold cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQ: ActiveQuestion = session.questions[currentIdx];
  const answeredCount = Object.values(selectedAnswers).filter((v) => v !== null && v !== undefined).length;
  const unansweredCount = session.num_questions - answeredCount;
  const selectedOptionIndex = selectedAnswers[currentQ.position];
  const isFlagged = !!flaggedQuestions[currentQ.position];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-28">
      {/* Top Bar: Subject, Title, Timer, Autosave Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <span>{session.subject.name}</span>
            <span>•</span>
            <span className="text-slate-300">{session.topic_name}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white mt-0.5">
            Timed Examination ({session.num_questions} Questions)
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span>{saveStatus}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <TimerRing
            remainingSeconds={remainingSec}
            totalSeconds={session.duration_seconds}
            size={90}
            strokeWidth={6}
          />
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Test</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Question Viewer (8 cols) + Question Palette (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Question Panel */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <GlassCard elevated className="p-6 md:p-8 min-h-[460px] flex flex-col justify-between">
            {/* Question Header */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                  Question {currentQ.position} of {session.num_questions}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                    Difficulty: {currentQ.difficulty}
                  </span>
                  <button
                    onClick={handleToggleFlag}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isFlagged
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-400 text-amber-400' : ''}`} />
                    <span>{isFlagged ? 'Flagged' : 'Flag for review'}</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <h2 className="text-lg md:text-xl font-bold text-slate-100 leading-relaxed mb-6">
                {currentQ.text}
              </h2>

              {/* 4 Options Grid */}
              <div className="space-y-3">
                {currentQ.options.map((optionText, optIdx) => {
                  const isSelected = selectedOptionIndex === optIdx;
                  const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-4 ${
                        isSelected
                          ? 'glass-panel-elevated border-indigo-400 bg-indigo-950/40 shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                          : 'glass-panel border-white/10 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {letter}
                      </div>
                      <span className="text-sm font-medium text-slate-200 leading-relaxed">
                        {optionText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Previous / Next Controls */}
            <div className="flex items-center justify-between pt-6 mt-8 border-t border-white/10">
              <button
                disabled={currentIdx === 0}
                onClick={() => switchQuestion(currentIdx - 1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-panel text-sm font-semibold text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="text-xs text-slate-400 font-medium hidden sm:block">
                Use Option clicks or Palette to navigate
              </div>

              <button
                disabled={currentIdx === session.num_questions - 1}
                onClick={() => switchQuestion(currentIdx + 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass-button text-sm font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Right: Question Palette Drawer */}
        <div className="lg:col-span-4">
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              Question Palette
            </h3>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/5 border border-white/10 mb-4 text-center">
              <div>
                <div className="text-lg font-extrabold text-emerald-400">{answeredCount}</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Answered</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-400">{unansweredCount}</div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Unanswered</div>
              </div>
              <div>
                <div className="text-lg font-extrabold text-amber-400">
                  {Object.values(flaggedQuestions).filter(Boolean).length}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Flagged</div>
              </div>
            </div>

            {/* Interactive Grid of Questions */}
            <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {session.questions.map((q, idx) => {
                const isCurrent = currentIdx === idx;
                const isAns = selectedAnswers[q.position] !== null && selectedAnswers[q.position] !== undefined;
                const isFlg = !!flaggedQuestions[q.position];

                let bgClass = 'bg-white/5 border-white/10 text-slate-400';
                if (isCurrent) {
                  bgClass = 'border-indigo-400 ring-2 ring-indigo-500/60 bg-indigo-600/30 text-white font-bold';
                } else if (isAns) {
                  bgClass = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => switchQuestion(idx)}
                    className={`relative h-10 rounded-xl border flex items-center justify-center text-xs transition-all cursor-pointer ${bgClass}`}
                  >
                    <span>{q.position}</span>
                    {isFlg && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Answered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Flagged
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/20" /> Unanswered
              </span>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Confirmation Submit Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <GlassCard elevated className="w-full max-w-md p-6 text-center border-white/15">
            <HelpCircle className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Submit Mock Test?</h3>
            <p className="text-sm text-slate-300 mb-6">
              You have answered <span className="text-emerald-400 font-bold">{answeredCount}</span> of{' '}
              <span className="text-white font-bold">{session.num_questions}</span> questions.
              {unansweredCount > 0 && (
                <span className="block mt-1 text-amber-300 font-medium">
                  {unansweredCount} question{unansweredCount > 1 ? 's are' : ' is'} still unanswered!
                </span>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl glass-panel text-sm font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                Continue Test
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleSubmitTest();
                }}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                {isSubmitting ? 'Scoring...' : 'Confirm Submit'}
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
