import React, { useState, useEffect } from 'react';
import { analyticsApi, testsApi } from '../../lib/api';
import type { DashboardSummary, DashboardTrendItem, SubjectStat, WeakTopic, TestSummary } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatCard } from '../../components/ui/StatCard';
import {
  Trophy,
  Flame,
  CheckCircle,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Layers,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

interface DashboardViewProps {
  onStartNewTest: (subjectId?: number, topic?: string) => void;
  onViewResult: (sessionId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartNewTest,
  onViewResult,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<DashboardTrendItem[]>([]);
  const [subjectsStats, setSubjectsStats] = useState<SubjectStat[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [recentTests, setRecentTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.getSummary(),
      analyticsApi.getTrend(),
      analyticsApi.getSubjectsStats(),
      testsApi.getTestHistory(),
    ])
      .then(([sumData, trendData, subjData, histData]) => {
        setSummary(sumData);
        setTrend(trendData);
        setSubjectsStats(subjData.subjects);
        setWeakTopics(subjData.weak_topics);
        setRecentTests(histData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed loading dashboard:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading student analytics & insights...</p>
        </div>
      </div>
    );
  }

  const hasTests = summary && summary.total_tests > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
            Student Performance Hub
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-2">
            Exam Mastery Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your accuracy curves, pinpoint weak areas, and practice with fresh AI mock tests.
          </p>
        </div>

        <button
          onClick={() => onStartNewTest()}
          className="px-6 py-3.5 rounded-xl glass-button text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(99,102,241,0.45)] cursor-pointer self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch New Mock Test</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Tests Completed"
          value={summary?.total_tests || 0}
          subtitle="Mock Sessions Taken"
          icon={<Layers className="w-5 h-5 text-indigo-400" />}
          trend="+100% On Schedule"
          glowColor="rgba(99, 102, 241, 0.25)"
        />
        <StatCard
          title="Average Accuracy"
          value={`${summary?.average_accuracy || 0}%`}
          subtitle="Overall Score Rate"
          icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
          trend={summary && summary.average_accuracy >= 70 ? 'Optimal' : 'Needs Practice'}
          glowColor="rgba(16, 185, 129, 0.25)"
        />
        <StatCard
          title="Best Subject"
          value={summary?.best_subject || 'N/A'}
          subtitle="Highest Proficiency"
          icon={<Trophy className="w-5 h-5 text-amber-400" />}
          glowColor="rgba(245, 158, 11, 0.25)"
        />
        <StatCard
          title="Daily Study Streak"
          value={`${summary?.current_streak || 0} Days`}
          subtitle="Keep the Momentum"
          icon={<Flame className="w-5 h-5 text-rose-400" />}
          glowColor="rgba(244, 63, 94, 0.25)"
        />
      </div>

      {/* If No Tests Yet: Empty State */}
      {!hasTests ? (
        <GlassCard elevated className="p-12 text-center my-8 border-indigo-500/20">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
            <Sparkles className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No Tests Taken Yet</h2>
          <p className="text-slate-400 max-w-md mx-auto text-sm mb-6">
            Take your very first AI-generated mock test to unlock dynamic accuracy curves, subject mastery analysis, and personalized weak topic insights.
          </p>
          <button
            onClick={() => onStartNewTest()}
            className="px-8 py-3.5 rounded-xl glass-button text-white font-bold text-sm inline-flex items-center gap-2 shadow-[0_0_24px_rgba(99,102,241,0.5)] cursor-pointer"
          >
            <span>Start Your First Test</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </GlassCard>
      ) : (
        <>
          {/* Charts Row: Accuracy Curve (8 cols) & Subject Proficiency (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Accuracy Trend Chart */}
            <div className="lg:col-span-8">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-400" />
                      Accuracy Trend Over Time
                    </h2>
                    <p className="text-xs text-slate-400">Progression across your recent mock test sessions.</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-white/5 border border-white/10 text-slate-300">
                    Last {trend.length} Tests
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          borderColor: 'rgba(255, 255, 255, 0.15)',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          fontSize: '12px',
                        }}
                        labelFormatter={(lbl) => `Date: ${lbl}`}
                        formatter={(val: any, _name: any, item: any) => [
                          `${val}% (Score: ${item.payload.score}/${item.payload.total})`,
                          `${item.payload.subject} — ${item.payload.topic}`,
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#818cf8"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#accuracyGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </div>

            {/* Subject Breakdown Bars */}
            <div className="lg:col-span-4">
              <GlassCard className="p-6 flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    Subject Proficiency
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">Average test scores categorized by subject discipline.</p>

                  <div className="space-y-4">
                    {subjectsStats.map((sub) => (
                      <div key={sub.subject}>
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-slate-200">{sub.subject}</span>
                          <span className={`${sub.accuracy >= 70 ? 'text-emerald-400' : 'text-indigo-300'}`}>
                            {sub.accuracy}% ({sub.tests_count} {sub.tests_count > 1 ? 'tests' : 'test'})
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              sub.accuracy >= 70 ? 'bg-emerald-500' : sub.accuracy >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, sub.accuracy))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                  <button
                    onClick={() => onStartNewTest()}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Practice New Subject
                  </button>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Weak Topics & Recent Tests Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Weak Topics Alert */}
            <div className="lg:col-span-5">
              <GlassCard className="p-6 h-full">
                <div className="flex items-center gap-2 mb-1 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                  <h2 className="text-lg font-bold text-white">Focus & Review Topics</h2>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Areas where recent accuracy fell below 65%. Retake to strengthen conceptual mastery.
                </p>

                {weakTopics.length === 0 ? (
                  <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs text-emerald-300">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    Great job! You do not have any critical weak topics below 65%.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {weakTopics.map((wt, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{wt.topic}</div>
                          <div className="text-[11px] text-slate-400">{wt.subject}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-rose-400">{wt.accuracy}%</span>
                          <button
                            onClick={() => onStartNewTest(undefined, wt.topic)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            Practice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Recent Tests Table */}
            <div className="lg:col-span-7">
              <GlassCard className="p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Recent Mock Examinations</h2>
                    <p className="text-xs text-slate-400">Review detailed answers and explanations from past sessions.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="pb-3">Subject / Topic</th>
                        <th className="pb-3 text-center">Score</th>
                        <th className="pb-3 text-center">Accuracy</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recentTests.slice(0, 5).map((t) => (
                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3">
                            <div className="font-bold text-slate-200">{t.topic_name}</div>
                            <div className="text-[11px] text-slate-400">{t.subject_name}</div>
                          </td>
                          <td className="py-3 text-center font-medium text-slate-300">
                            {t.score} / {t.num_questions}
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                t.accuracy >= 70
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : t.accuracy >= 50
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-rose-500/15 text-rose-300'
                              }`}
                            >
                              {t.accuracy}%
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => onViewResult(t.id)}
                              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                            >
                              View Results →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
