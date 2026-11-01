import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { chatApi } from '../../lib/api';
import type { ChatConversation, ChatMessage } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  User,
  X,
} from 'lucide-react';

interface ChatDrawerProps {
  initialDoubt?: string | null;
  onClose?: () => void;
}

const formatTutorContent = (content: string) =>
  // The tutor commonly returns LaTeX using \(...\) and \[...\]. Convert it
  // to the dollar delimiters understood by remark-math before rendering.
  content
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  initialDoubt,
  onClose,
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputContent, setInputContent] = useState<string>(initialDoubt || '');
  const [isSending, setIsSending] = useState<boolean>(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    chatApi.getConversations()
      .then(async (convs) => {
        setConversations(convs);
        if (convs.length > 0) {
          setActiveConvId(convs[0].id);
        } else {
          // Create initial conversation
          const newConv = await chatApi.createConversation('Study Doubt Session');
          setConversations([newConv]);
          setActiveConvId(newConv.id);
        }
      })
      .catch((err) => {
        console.error('Error loading conversations:', err);
      });
  }, []);

  // Pre-fill initial doubt if provided
  useEffect(() => {
    if (initialDoubt) {
      setInputContent(initialDoubt);
    }
  }, [initialDoubt]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConvId) {
      chatApi.getMessages(activeConvId).then((msgs) => {
        setMessages(msgs);
        scrollToBottom();
      });
    }
  }, [activeConvId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      const container = messagesContainerRef.current;
      if (!container) return;

      // Keep auto-scroll inside the transcript. scrollIntoView also scrolls the
      // page on mobile, which made the tutor jump while a user was reading.
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  };

  const handleCreateNewConv = async () => {
    const newConv = await chatApi.createConversation('New Doubt Session');
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setMessages([]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim() || isSending || !activeConvId) return;

    const userText = inputContent.trim();
    setInputContent('');
    setIsSending(true);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    scrollToBottom();

    try {
      const data = await chatApi.sendMessage(activeConvId, userText);
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), data.user_message, data.assistant_message]);
      scrollToBottom();
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${err.response?.data?.detail || 'Failed to reach AI Tutor. Please try again.'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mobile-page mobile-enter max-w-6xl mx-auto px-4 py-8 pb-32">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
            Astra AI Tutor
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1.5 flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-purple-400" />
            AI Doubt Solving Tutor
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Ask concept questions, decompose tricky math equations, and get step-by-step solutions.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2-Column Chat Layout: Conversations Sidebar (4 cols) + Chat Window (8 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-auto md:h-[640px]">
        {/* Conversations Sidebar */}
        <div className="md:col-span-4 h-[184px] md:h-full min-h-0">
          <GlassCard className="p-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Doubt Sessions
                </span>
                <button
                  onClick={handleCreateNewConv}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              </div>

              {/* Sessions List */}
              <div className="flex md:block gap-1.5 overflow-x-auto overscroll-x-contain md:overflow-y-auto md:overscroll-contain max-h-[112px] md:max-h-[520px] pr-1 pb-1 touch-pan-x md:touch-pan-y">
                {conversations.map((c) => {
                  const isActive = activeConvId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveConvId(c.id)}
                      className={`min-w-[180px] md:w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                        isActive
                          ? 'glass-panel-elevated border-purple-500/50 bg-purple-950/30 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold truncate">{c.title}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {c.last_message || 'Start asking doubts...'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Chat Messages & Input Panel */}
        <div className="md:col-span-8 h-[520px] md:h-full min-h-0">
          <GlassCard elevated className="p-4 sm:p-6 h-full min-h-0 flex flex-col justify-between border-purple-500/20">
            {/* Messages Scroll Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pr-2 space-y-4 mb-4"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3">
                    <Bot className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Hello! I'm Astra, your AI Tutor.</h3>
                  <p className="text-xs max-w-sm">
                    Ask me any question from your mock tests or curriculum. I break problems down into intuitive, step-by-step explanations.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] min-w-0 p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                            : 'glass-panel border-white/10 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {isUser ? (
                          m.content
                        ) : (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              h1: ({ children }) => <h1 className="text-base md:text-lg font-extrabold text-white mt-1 mb-3">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-sm md:text-base font-extrabold text-white mt-4 mb-2">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-bold text-purple-300 mt-3 mb-1.5">{children}</h3>,
                              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                              ul: ({ children }) => <ul className="list-disc space-y-1.5 pl-5 mb-3 marker:text-purple-400">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal space-y-2 pl-5 mb-3 marker:font-bold marker:text-purple-300">{children}</ol>,
                              li: ({ children }) => <li className="pl-0.5">{children}</li>,
                              hr: () => <hr className="my-4 border-white/15" />,
                              blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-purple-400/70 pl-3 text-slate-300">{children}</blockquote>,
                              code: ({ children, className }) => className
                                ? <code className="block my-3 overflow-x-auto rounded-lg bg-black/25 p-3 font-mono text-[.78em] text-cyan-200">{children}</code>
                                : <code className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[.85em] text-cyan-200">{children}</code>,
                              a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-cyan-300 underline underline-offset-2">{children}</a>,
                            }}
                          >
                            {formatTutorContent(m.content)}
                          </ReactMarkdown>
                        )}
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {isSending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3.5 rounded-2xl glass-panel border-white/10 text-slate-300 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px] text-slate-400 ml-1">Formulating step-by-step explanation...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="Ask Astra a doubt, or paste a question to solve..."
                disabled={isSending}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-900/80 border border-white/15 text-white placeholder-slate-500 text-xs md:text-sm focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={!inputContent.trim() || isSending}
                className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_16px_rgba(168,85,247,0.4)]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
