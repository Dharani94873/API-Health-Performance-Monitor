import { useState } from 'react';
import { MdPerson, MdEmail, MdLock, MdSave, MdCamera } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDate, getInitials } from '../utils/helpers';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    emailNotifications: user?.emailNotifications ?? true,
    slackWebhookUrl: user?.slackWebhookUrl || '',
    discordWebhookUrl: user?.discordWebhookUrl || '',
  });
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: ''
  });

  const publicStatusUrl = `${window.location.origin}/status/${user?.id || user?._id}`;

  const copyStatusLink = () => {
    navigator.clipboard.writeText(publicStatusUrl);
    toast.success('Public status URL copied to clipboard!');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const { data } = await api.put('/auth/profile', profileForm);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setPassLoading(true);
    try {
      await api.put('/auth/password', { currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password changed!');
      setPassForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MdPerson className="text-primary-400" /> Profile
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account settings</p>
      </div>

      {/* Avatar */}
      <div className="glass-card p-6 flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white">
            {getInitials(user?.name)}
          </div>
        </div>
        <div>
          <p className="text-xl font-semibold text-white">{user?.name}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <p className="text-xs text-slate-600 mt-1">Member since {formatDate(user?.createdAt)}</p>
        </div>
      </div>

      {/* Public Status Page Card */}
      <div className="glass-card p-6 border border-primary-500/30 space-y-3 bg-primary-500/5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          📢 Your Public Status Page
        </h3>
        <p className="text-xs text-slate-400">Share your live service health with your team or customers without authentication.</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={publicStatusUrl}
            className="input-field py-1.5 text-xs text-slate-300 bg-slate-900/60"
          />
          <button type="button" onClick={copyStatusLink} className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap">
            Copy Link
          </button>
          <a href={publicStatusUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap">
            Open
          </a>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleProfileSubmit} className="glass-card p-6 space-y-4">
        <h3 className="font-semibold text-white">Account Information</h3>

        <div>
          <label className="label">Full Name</label>
          <div className="relative">
            <MdPerson className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="profile-name"
              type="text"
              value={profileForm.name}
              onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
              className="input-field pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Email Address</label>
          <div className="relative">
            <MdEmail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="email" value={user?.email} className="input-field pl-10 opacity-50 cursor-not-allowed" disabled />
          </div>
          <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
        </div>

        {/* Webhooks Section */}
        <div className="pt-2 space-y-3">
          <h4 className="text-sm font-semibold text-white">💬 Webhook Alert Integrations (Free)</h4>
          <div>
            <label className="label text-xs">Slack Incoming Webhook URL</label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={profileForm.slackWebhookUrl}
              onChange={e => setProfileForm(p => ({ ...p, slackWebhookUrl: e.target.value }))}
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="label text-xs">Discord Webhook URL</label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={profileForm.discordWebhookUrl}
              onChange={e => setProfileForm(p => ({ ...p, discordWebhookUrl: e.target.value }))}
              className="input-field text-xs"
            />
          </div>
        </div>

        {/* Email Notifications Toggle */}
        <div className="flex items-center justify-between p-4 bg-white/3 rounded-xl">
          <div>
            <p className="text-sm font-medium text-slate-300">Email Notifications</p>
            <p className="text-xs text-slate-500">Receive email alerts when APIs go down</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={profileForm.emailNotifications}
              onChange={e => setProfileForm(p => ({ ...p, emailNotifications: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </label>
        </div>

        <button id="profile-save" type="submit" disabled={profileLoading} className="btn-primary">
          {profileLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdSave /> Save Changes</>}
        </button>
      </form>

      {/* Password Form */}
      <form onSubmit={handlePasswordSubmit} className="glass-card p-6 space-y-4">
        <h3 className="font-semibold text-white">Change Password</h3>

        <div>
          <label className="label">Current Password</label>
          <div className="relative">
            <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="current-password"
              type="password"
              value={passForm.currentPassword}
              onChange={e => setPassForm(p => ({ ...p, currentPassword: e.target.value }))}
              className="input-field pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">New Password</label>
          <div className="relative">
            <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="new-password"
              type="password"
              value={passForm.newPassword}
              onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))}
              className="input-field pl-10"
              required
              minLength={6}
            />
          </div>
        </div>

        <div>
          <label className="label">Confirm New Password</label>
          <div className="relative">
            <MdLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="confirm-new-password"
              type="password"
              value={passForm.confirm}
              onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))}
              className={`input-field pl-10 ${passForm.confirm && passForm.confirm !== passForm.newPassword ? 'border-red-500/50' : ''}`}
              required
            />
          </div>
        </div>

        <button id="change-password-submit" type="submit" disabled={passLoading} className="btn-primary">
          {passLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><MdLock /> Change Password</>}
        </button>
      </form>
    </div>
  );
}
