import React from 'react';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  glowColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  glowColor = 'rgba(99, 102, 241, 0.2)',
}) => {
  return (
    <GlassCard tilt glowColor={glowColor} className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-3xl font-extrabold text-white tracking-tight mb-1">{value}</div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          {subtitle && <span>{subtitle}</span>}
          {trend && <span className="text-emerald-400 font-medium">{trend}</span>}
        </div>
      </div>
    </GlassCard>
  );
};
