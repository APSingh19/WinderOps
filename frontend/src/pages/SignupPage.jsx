import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { signup } from '../store/authSlice.js';
import { AuthShell } from './AuthShell.jsx';

export function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Member' });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await dispatch(signup(form)).unwrap();
      toast.success('Account created');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create workspace access" subtitle="Start with an Admin or Member account.">
      <form onSubmit={submit} className="space-y-4">
        <input className="input" placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        <input className="input" type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={6} />
        <select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option>Member</option>
          <option>Admin</option>
        </select>
        <button className="btn-primary w-full" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
      </form>
      <p className="mt-5 text-sm text-slate-500">Already have access? <Link className="font-semibold text-marine" to="/login">Sign in</Link></p>
    </AuthShell>
  );
}
