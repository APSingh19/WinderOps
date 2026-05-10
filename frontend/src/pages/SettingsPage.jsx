import { Bell, Building2, Moon, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api/client.js';
import { setUser } from '../store/authSlice.js';
import { toggleTheme } from '../store/themeSlice.js';

const Field = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
    <div className="mt-1">{children}</div>
    {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
  </label>
);

export function SettingsPage() {
  const dispatch = useDispatch();
  const { mode } = useSelector((state) => state.theme);
  const { user } = useSelector((state) => state.auth);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    title: '',
    designation: '',
    workRole: '',
    bio: '',
    skills: '',
    weeklyCapacityHours: 40,
    maxActiveTasks: 8
  });

  useEffect(() => {
    setForm({
      name: user?.name || '',
      title: user?.title || '',
      designation: user?.designation || '',
      workRole: user?.workRole || '',
      bio: user?.bio || '',
      skills: (user?.skills || []).join(', '),
      weeklyCapacityHours: user?.weeklyCapacityHours ?? 40,
      maxActiveTasks: user?.maxActiveTasks ?? 8
    });
  }, [user]);

  const updateProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        weeklyCapacityHours: Number(form.weeklyCapacityHours),
        maxActiveTasks: Number(form.maxActiveTasks),
        skills: form.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
      };
      const { data } = await api.patch('/users/me/profile', payload);
      dispatch(setUser(data));
      toast.success('Profile updated');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="text-sm text-slate-500">Workspace preferences, role access, notifications, and enterprise navigation controls.</p>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel rounded-lg p-5">
          <h2 className="flex items-center gap-2 font-black"><ShieldCheck size={18} /> Role profile</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <p className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">Signed in as <b>{user?.name}</b></p>
            <p className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">Current role: <b>{user?.role}</b></p>
            <p className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">Navigation adapts around organization, department, team, and employee scopes.</p>
          </div>
        </article>

        <form onSubmit={updateProfile} className="panel rounded-lg p-5">
          <div>
            <h2 className="font-black">Edit Profile</h2>
            <p className="mt-1 text-sm text-slate-500">Update the profile details shown across employee cards, tasks, and organization views.</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Full name" hint="Your display name across the workspace.">
              <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </Field>
            <Field label="Job title" hint="Short title, for example Product Manager.">
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </Field>
            <Field label="Designation" hint="Official designation or level.">
              <input className="input" value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} />
            </Field>
            <Field label="Work role" hint="Main responsibility, for example Frontend Lead.">
              <input className="input" value={form.workRole} onChange={(event) => setForm({ ...form, workRole: event.target.value })} />
            </Field>
            <Field label="Weekly capacity hours" hint="Available work hours per week." >
              <input className="input" type="number" min="0" max="168" value={form.weeklyCapacityHours} onChange={(event) => setForm({ ...form, weeklyCapacityHours: event.target.value })} />
            </Field>
            <Field label="Maximum active tasks" hint="Recommended task load before capacity warnings.">
              <input className="input" type="number" min="1" max="100" value={form.maxActiveTasks} onChange={(event) => setForm({ ...form, maxActiveTasks: event.target.value })} />
            </Field>
            <Field label="Skills" hint="Separate skills with commas, for example React, APIs, Testing." className="md:col-span-2">
              <input className="input" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
            </Field>
            <Field label="Bio" hint={`${form.bio.length}/280 characters`} className="md:col-span-2">
              <textarea className="input min-h-28" maxLength={280} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
          </div>
        </form>

        <article className="panel rounded-lg p-5">
          <h2 className="flex items-center gap-2 font-black"><SlidersHorizontal size={18} /> Preferences</h2>
          <div className="mt-4 space-y-3">
            <button className="btn-ghost w-full justify-between" onClick={() => dispatch(toggleTheme())}>
              <span className="inline-flex items-center gap-2"><Moon size={16} /> Theme</span>
              <b>{mode === 'dark' ? 'Dark' : 'Light'}</b>
            </button>
            <div className="rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-900"><Bell className="mr-2 inline" size={16} /> Department and team socket notifications are enabled.</div>
            <div className="rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-900"><Building2 className="mr-2 inline" size={16} /> Department shortcuts appear in the enterprise sidebar.</div>
          </div>
        </article>
      </section>
    </div>
  );
}
