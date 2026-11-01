import React, { useState, useEffect } from 'react';
import { testsApi } from '../../lib/api';
import type { TestSummary } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { History, Search, ArrowRight, Clock, Award, Sparkles } from 'lucide-react';

interface TestHistoryViewProps {
  onViewResult: (sessionId: string) => void;
  onStartNewTest: () => void;
}

export const TestHistoryView: React.FC<TestHistoryViewProps> = ({
  onViewResult,
  onStartNewTest,
}) => {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testsApi.getTestHistory()
      .then((data) => {
        setTests(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = tests.filter(
    (t) =>
      t.topic_name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mobile-page mobile-enter max-w-5xl mx-auto px-4 py-8 pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-indigo-400" />
            Mock Test History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse all completed examination sessions and review answer rationales.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topic or subject..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-12 text-center my-6">
          <Award className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Tests Found</h3>
          <p className="text-xs text-slate-400 mb-6">
            {search ? 'Try adjusting your search query.' : 'You have not completed any mock test sessions yet.'}
          </p>
          <button
            onClick={onStartNewTest}
            className="px-6 py-2.5 rounded-xl glass-button text-xs font-bold text-white inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch a Mock Test</span>
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const minutes = Math.floor(t.total_time_spent_sec / 60);
            const seconds = t.total_time_spent_sec % 60;
            const dateStr = new Date(t.submitted_at || t.started_at).toLocaleString();

            return (
              <GlassCard
                key={t.id}
                tilt
                onClick={() => onViewResult(t.id)}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-white/20 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                    <span>{t.subject_name}</span>
                    <span>•</span>
                    <span className="text-slate-400 font-normal">{dateStr}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{t.topic_name}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                    <span>{t.num_questions} Questions</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" /> {minutes}m {seconds}s
                    </span>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-6">
                  <div className="text-right">
                    <div className="text-base font-extrabold text-white">
                      {t.score} / {t.num_questions}
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        t.accuracy >= 70
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : t.accuracy >= 50
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {t.accuracy}% Accuracy
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 group-hover:text-white">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
