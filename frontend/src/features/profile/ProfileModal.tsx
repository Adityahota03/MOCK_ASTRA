import React, { useState } from 'react';
import { useAuthStore } from '../../lib/authStore';
import { accountsApi } from '../../lib/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { User, CheckCircle2, Save } from 'lucide-react';

export const ProfileModal: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [gradeLevel, setGradeLevel] = useState(user?.profile?.grade_level || '');
  const [institution, setInstitution] = useState(user?.profile?.institution || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setProfileMessage(null);
    try {
      const updated = await accountsApi.updateProfile({
        full_name: fullName,
        profile: {
          grade_level: gradeLevel,
          institution,
          bio,
        },
      });
      updateUser(updated);
      setProfileMessage('Profile successfully updated!');
    } catch {
      setProfileMessage('Error updating profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);
    try {
      await accountsApi.changePassword(oldPassword, newPassword);
      setPassMessage('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPassMessage(err.response?.data?.old_password?.[0] || 'Failed to update password.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <User className="w-7 h-7 text-indigo-400" />
          Student Account & Preferences
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your personal information, grade level, and security settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Profile Form (7 cols) */}
        <div className="md:col-span-7">
          <GlassCard elevated className="p-6 md:p-8">
            <h2 className="text-lg font-bold text-white mb-4">Academic Profile</h2>

            {profileMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {profileMessage}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address (Verified)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/40 border border-white/5 text-slate-400 text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Exam / Grade Level
                </label>
                <input
                  type="text"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  placeholder="e.g. Grade 12 / Pre-Med / Competitive Entrance"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Institution / School
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Apex International Academy"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Bio / Goals
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a brief note on your target test and study ambitions..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-xl glass-button text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(99,102,241,0.35)]"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Change Password Form (5 cols) */}
        <div className="md:col-span-5">
          <GlassCard className="p-6 md:p-8">
            <h2 className="text-lg font-bold text-white mb-4">Security & Password</h2>

            {passMessage && (
              <div className="mb-4 p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs">
                {passMessage}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl glass-panel hover:bg-white/10 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Update Password
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/10">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Data Protection & Privacy
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All mock test answers, AI queries, and profile telemetry are encrypted under strict privacy guidelines compliant with applicable data security frameworks.
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
