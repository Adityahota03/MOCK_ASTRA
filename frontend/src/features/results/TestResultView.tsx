import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { testsApi } from '../../lib/api';
import type { TestSessionResult } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Bot,
} from 'lucide-react';

interface TestResultViewProps {
  sessionId: string;
  onRetake: (subjectId: number, topicName: string) => void;
  onAskTutor: (questionText: string, options: string[], explanation: string) => void;
  onGoDashboard: () => void;
}

export const TestResultView: React.FC<TestResultViewProps> = ({
  sessionId,
  onRetake,
  onAskTutor,
  onGoDashboard,
}) => {
  const [result, setResult] = useState<TestSessionResult | null>(null);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testsApi.getResult(sessionId)
      .then((data) => {
        setResult(data);
        setLoading(false);
        if (data.accuracy >= 70) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load test results.');
        setLoading(false);
      });
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Compiling performance analytics and explanations...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 glass-panel text-center">
        <h3 className="text-lg font-bold text-white mb-2">Unable to Load Result</h3>
        <p className="text-sm text-slate-400 mb-6">{error || 'Result not available.'}</p>
        <button onClick={onGoDashboard} className="px-6 py-2.5 rounded-xl glass-button text-white text-sm font-semibold">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const minutesTaken = Math.floor(result.total_time_spent_sec / 60);
  const secondsTaken = result.total_time_spent_sec % 60;
  const timeFormatted = `${minutesTaken}m ${secondsTaken}s`;

  const filteredQuestions = result.questions.filter((q) => {
    if (filter === 'correct') return q.is_correct === true;
    if (filter === 'incorrect') return q.is_correct !== true;
    return true;
  });

  return (
    <div className="mobile-page mobile-enter max-w-5xl mx-auto px-4 py-8 pb-32">
      {/* Top Hero: Score & Key Metrics */}
      <GlassCard elevated className="p-8 mb-8 border-indigo-500/30 relative overflow-hidden">
        <div className="ambient-bg" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
              <span>{result.subject.name}</span>
              <span>•</span>
              <span className="text-slate-300">{result.topic_name}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-400" />
              Examination Results
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Test completed on {new Date(result.submitted_at || result.started_at).toLocaleString()}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => onRetake(result.subject.id, result.topic_name)}
              className="px-4 py-2.5 rounded-xl glass-button text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(99,102,241,0.35)]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake with Fresh Questions</span>
            </button>
            <button
              onClick={onGoDashboard}
              className="px-4 py-2.5 rounded-xl glass-panel text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* 4 Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-3xl font-extrabold text-white">{result.score} / {result.num_questions}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Total Score</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className={`text-3xl font-extrabold ${result.accuracy >= 70 ? 'text-emerald-400' : result.accuracy >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
              {result.accuracy}%
            </div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Accuracy</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-3xl font-extrabold text-white">{timeFormatted}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Time Spent</div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-3xl font-extrabold text-indigo-400">
              {result.accuracy >= 70 ? 'Mastered' : result.accuracy >= 50 ? 'Developing' : 'Review Needed'}
            </div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">Proficiency</div>
          </div>
        </div>
      </GlassCard>

      {/* Review Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Question-by-Question Review</h2>
          <p className="text-xs text-slate-400">Study correct answers and AI-formulated conceptual explanations.</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              filter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({result.num_questions})
          </button>
          <button
            onClick={() => setFilter('correct')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              filter === 'correct' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Correct ({result.score})
          </button>
          <button
            onClick={() => setFilter('incorrect')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              filter === 'incorrect' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Incorrect ({result.num_questions - result.score})
          </button>
        </div>
      </div>

      {/* Questions Review List */}
      <div className="space-y-6">
        {filteredQuestions.map((q) => {
          const isCorrect = q.is_correct === true;
          const userSelected = q.selected_index;
          const correctIdx = q.correct_index;

          return (
            <GlassCard key={q.id} className="p-6 md:p-8">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-white/10 text-slate-300">
                    Question {q.position}
                  </span>
                  {isCorrect ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect
                    </span>
                  )}
                </div>

                {/* Ask Tutor Action Button */}
                <button
                  onClick={() => onAskTutor(q.text, q.options, q.explanation)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-xs font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>Ask AI Tutor</span>
                </button>
              </div>

              {/* Question Text */}
              <h3 className="text-base md:text-lg font-bold text-white mb-4 leading-relaxed">
                {q.text}
              </h3>

              {/* Options Breakdown */}
              <div className="space-y-2.5 mb-5">
                {q.options.map((opt, oIdx) => {
                  const letter = String.fromCharCode(65 + oIdx);
                  const isAnswerKey = oIdx === correctIdx;
                  const isUserPick = oIdx === userSelected;

                  let borderClass = 'border-white/10 bg-white/5 text-slate-300';
                  if (isAnswerKey) {
                    borderClass = 'border-emerald-500/50 bg-emerald-950/30 text-emerald-200 font-semibold shadow-[0_0_14px_rgba(16,185,129,0.2)]';
                  } else if (isUserPick && !isCorrect) {
                    borderClass = 'border-rose-500/50 bg-rose-950/30 text-rose-200';
                  }

                  return (
                    <div
                      key={oIdx}
                      className={`p-3.5 rounded-xl border flex items-center justify-between text-xs md:text-sm ${borderClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">
                          {letter}
                        </span>
                        <span>{opt}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-xs font-bold">
                        {isAnswerKey && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Correct Answer
                          </span>
                        )}
                        {isUserPick && !isAnswerKey && (
                          <span className="text-rose-400 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Your Choice
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation Card */}
              {q.explanation && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                  <span className="font-bold text-indigo-300 block mb-1">Conceptual Explanation:</span>
                  {q.explanation}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
