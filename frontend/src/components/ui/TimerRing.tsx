import React from 'react';
import { Clock } from 'lucide-react';

interface TimerRingProps {
  remainingSeconds: number;
  totalSeconds: number;
  size?: number;
  strokeWidth?: number;
}

export const TimerRing: React.FC<TimerRingProps> = ({
  remainingSeconds,
  totalSeconds,
  size = 110,
  strokeWidth = 7,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(1, totalSeconds);
  const progress = Math.min(1, Math.max(0, remainingSeconds / safeTotal));
  const strokeDashoffset = circumference - progress * circumference;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Visual alert states: Warning at 5 min, Urgent at 1 min
  let ringColor = 'stroke-indigo-400';
  let glowColor = 'rgba(99, 102, 241, 0.4)';
  let isPulsing = false;

  if (remainingSeconds <= 60) {
    ringColor = 'stroke-rose-500';
    glowColor = 'rgba(244, 63, 94, 0.6)';
    isPulsing = true;
  } else if (remainingSeconds <= 300) {
    ringColor = 'stroke-amber-400';
    glowColor = 'rgba(251, 191, 36, 0.5)';
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center p-1 rounded-full ${
        isPulsing ? 'animate-pulse' : ''
      }`}
      style={{
        filter: `drop-shadow(0 0 12px ${glowColor})`,
      }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-800/80 fill-none"
          strokeWidth={strokeWidth}
        />
        {/* Dynamic progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`fill-none transition-all duration-500 ease-linear ${ringColor}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>

      {/* Central content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <Clock className="w-3.5 h-3.5 mb-0.5 text-slate-400" />
        <span className="font-mono text-base font-bold text-slate-100 tracking-wider">
          {formattedTime}
        </span>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
          {remainingSeconds <= 60 ? 'Hurry!' : 'Remaining'}
        </span>
      </div>
    </div>
  );
};
