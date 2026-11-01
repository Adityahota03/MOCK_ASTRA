import React, { useState, useEffect } from 'react';
import { catalogApi, testsApi } from '../../lib/api';
import type { Subject, Topic } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  BookOpen,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  Calculator,
  Landmark,
  Globe,
  Atom,
  Dna,
  FlaskConical,
  TrendingUp,
} from 'lucide-react';

interface TestWizardProps {
  onTestStarted: (sessionId: string) => void;
  onCancel: () => void;
  preselectedSubjectId?: number;
  preselectedTopic?: string;
}

const getSubjectIcon = (iconName: string) => {
  switch (iconName) {
    case 'calculator': return <Calculator className="w-5 h-5 text-blue-400" />;
    case 'landmark': return <Landmark className="w-5 h-5 text-amber-400" />;
    case 'globe': return <Globe className="w-5 h-5 text-emerald-400" />;
    case 'atom': return <Atom className="w-5 h-5 text-cyan-400" />;
    case 'dna': return <Dna className="w-5 h-5 text-rose-400" />;
    case 'flask-conical': return <FlaskConical className="w-5 h-5 text-purple-400" />;
    case 'trending-up': return <TrendingUp className="w-5 h-5 text-teal-400" />;
    default: return <Sparkles className="w-5 h-5 text-indigo-400" />;
  }
};

export const TestWizard: React.FC<TestWizardProps> = ({
  onTestStarted,
  onCancel,
  preselectedSubjectId,
  preselectedTopic,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(preselectedTopic ? 3 : preselectedSubjectId ? 2 : 1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [topicInput, setTopicInput] = useState(preselectedTopic || '');
  const [topicSearch, setTopicSearch] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('Consulting AI syllabus models...');
  const [error, setError] = useState<string | null>(null);

  // Load subjects
  useEffect(() => {
    catalogApi.getSubjects().then((data) => {
      setSubjects(data);
      if (preselectedSubjectId) {
        const found = data.find((s) => s.id === preselectedSubjectId);
        if (found) setSelectedSubject(found);
      }
    });
  }, [preselectedSubjectId]);

  // Load topics when subject changes
  useEffect(() => {
    if (selectedSubject) {
      catalogApi.getTopics(selectedSubject.id).then(setTopics);
    }
  }, [selectedSubject]);

  const handleStartGeneration = async () => {
    if (!selectedSubject || !topicInput.trim()) return;
    setIsGenerating(true);
    setError(null);

    const steps = [
      'Extracting topic curriculum and concepts...',
      'Formulating non-repeating questions via Groq...',
      'Running solver validation & answer key verification...',
      'Assembling timed spatial test session...',
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setGenerationStep(steps[i]);
        i++;
      }
    }, 1800);

    try {
      const sessionId = await testsApi.generateTest(
        selectedSubject.id,
        topicInput.trim(),
        questionCount
      );
      clearInterval(interval);
      onTestStarted(sessionId);
    } catch (err: any) {
      clearInterval(interval);
      setIsGenerating(false);
      setError(err.response?.data?.detail || 'Failed to generate test questions. Please try again.');
    }
  };

  const filteredTopics = topics.filter((t) =>
    t.name.toLowerCase().includes(topicSearch.toLowerCase())
  );

  if (isGenerating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
        <GlassCard elevated className="w-full max-w-lg p-10 text-center relative overflow-hidden border-indigo-500/30">
          <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
            {/* Outer orbital rings */}
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 animate-ping opacity-40" />
            <div className="absolute inset-2 rounded-full border-2 border-purple-500/40 border-t-purple-400 animate-spin" />
            <div className="absolute inset-5 rounded-full border-2 border-cyan-500/40 border-b-cyan-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
            <div className="p-4 rounded-full bg-indigo-600/20 border border-indigo-400/40 text-indigo-300 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">Generating Your Mock Test</h3>
          <p className="text-sm text-indigo-300 font-medium h-6 transition-all duration-300">{generationStep}</p>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" /> {selectedSubject?.name}
            </span>
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" /> {questionCount} MCQs
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {questionCount} Minutes
            </span>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mobile-page mobile-enter max-w-4xl mx-auto px-4 py-8 pb-32">
      {/* Wizard Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-8">
        <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-indigo-400" />
            Create AI Mock Test
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure your subject, choose or customize a topic, and set your question parameters.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Progress Steps Indicator */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { num: 1, title: 'Subject', desc: selectedSubject ? selectedSubject.name : 'Select subject' },
          { num: 2, title: 'Topic', desc: topicInput || 'Enter topic' },
          { num: 3, title: 'Questions', desc: `${questionCount} Questions` },
        ].map((s) => {
          const isDone = step > s.num;
          const isCurrent = step === s.num;
          return (
            <div
              key={s.num}
              onClick={() => {
                if (s.num === 1) setStep(1);
                else if (s.num === 2 && selectedSubject) setStep(2);
                else if (s.num === 3 && selectedSubject && topicInput.trim()) setStep(3);
              }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isCurrent
                  ? 'glass-panel-elevated border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                  : isDone
                  ? 'glass-panel border-emerald-500/30 text-emerald-300'
                  : 'glass-panel-subtle border-white/5 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-500 text-black'
                      : isCurrent
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">{s.title}</span>
              </div>
              <p className="text-xs truncate font-medium text-slate-300">{s.desc}</p>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Select Subject */}
      {step === 1 && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">Choose a Subject</h2>
            <p className="text-sm text-slate-400">Select the academic discipline for your mock examination.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {subjects.map((subj) => {
              const isSelected = selectedSubject?.id === subj.id;
              return (
                <GlassCard
                  key={subj.id}
                  tilt
                  onClick={() => {
                    setSelectedSubject(subj);
                    setTopicInput('');
                    setStep(2);
                  }}
                  className={`p-5 cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-900/30 shadow-[0_0_24px_rgba(99,102,241,0.3)]'
                      : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                  }`}
                >
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 w-fit mb-3">
                    {getSubjectIcon(subj.icon)}
                  </div>
                  <h3 className="font-bold text-base text-white mb-1">{subj.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{subj.description}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>{subj.topics_count} Suggested Topics</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: Choose / Enter Topic */}
      {step === 2 && selectedSubject && (
        <GlassCard elevated className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{selectedSubject.name}</span>
              <h2 className="text-2xl font-bold text-white mt-0.5">Specify Your Exam Topic</h2>
              <p className="text-sm text-slate-400 mt-1">
                Type any curriculum topic or pick from the curated syllabus suggestions below.
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Change Subject
            </button>
          </div>

          {/* Custom Topic Input */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Topic Name (2 – 100 characters)
            </label>
            <div className="relative">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Stone Age & Early Civilizations, Calculus Derivatives..."
                className="w-full px-4 py-3.5 rounded-xl bg-slate-900/80 border border-white/15 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Suggested Topics Search & Cloud */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Curated Topic Suggestions</span>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  placeholder="Filter suggestions..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {filteredTopics.map((top) => {
                const isSelected = topicInput === top.name;
                return (
                  <button
                    key={top.id}
                    type="button"
                    onClick={() => setTopicInput(top.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {top.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-white/10">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              disabled={!topicInput.trim() || topicInput.trim().length < 2}
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl glass-button text-sm font-semibold text-white flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Next: Set Count</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>
      )}

      {/* STEP 3: Question Count & Confirmation */}
      {step === 3 && selectedSubject && topicInput && (
        <GlassCard elevated className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 3 of 3</span>
              <h2 className="text-2xl font-bold text-white mt-0.5">Select Number of MCQs</h2>
              <p className="text-sm text-slate-400 mt-1">
                Choose the size of your test. Each question includes 4 options, a countdown timer, and in-depth explanations.
              </p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          {/* Question Count Options */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { count: 10, label: 'Quick Sprint', time: '10 Mins' },
              { count: 20, label: 'Standard Practice', time: '20 Mins' },
              { count: 30, label: 'Comprehensive Exam', time: '30 Mins (Default)' },
              { count: 50, label: 'Full Mock Test', time: '50 Mins' },
            ].map((opt) => {
              const isSelected = questionCount === opt.count;
              return (
                <div
                  key={opt.count}
                  onClick={() => setQuestionCount(opt.count)}
                  className={`p-5 rounded-2xl border text-center cursor-pointer transition-all ${
                    isSelected
                      ? 'glass-panel-elevated border-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.35)] scale-[1.02]'
                      : 'glass-panel border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div className="text-3xl font-extrabold text-white mb-1">{opt.count}</div>
                  <div className="text-xs font-bold text-indigo-400 mb-1">{opt.label}</div>
                  <div className="text-[11px] text-slate-400">{opt.time}</div>
                </div>
              );
            })}
          </div>

          {/* Summary Card */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-white/10 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Test Specification</div>
              <div className="text-base font-bold text-white mt-0.5">
                {selectedSubject.name} — <span className="text-indigo-300">{topicInput}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-4">
                <span>Total MCQs: {questionCount}</span>
                <span>•</span>
                <span>Time Allowed: {questionCount} Minutes</span>
                <span>•</span>
                <span>Passing Target: 70%</span>
              </div>
            </div>

            <button
              onClick={handleStartGeneration}
              className="py-3 px-8 rounded-xl glass-button text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(99,102,241,0.5)] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Mock Test</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
