import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/authSlice.js';
import { AuthShell } from './AuthShell.jsx';

export function LoginPage() {
  const [form, setForm] = useState({ email: 'admin@example.com', password: 'password123' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const status = useSelector((state) => state.auth.status);

  const submit = async (event) => {
    event.preventDefault();
    const result = await dispatch(login(form));
    if (result.meta.requestStatus === 'fulfilled') navigate('/dashboard');
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your project workspace.">
      <form onSubmit={submit} className="space-y-4">
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input className="input" type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <button className="btn-primary w-full" disabled={status === 'loading'}>{status === 'loading' ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <p className="mt-5 text-sm text-slate-500">New here? <Link className="font-semibold text-marine" to="/signup">Create an account</Link></p>
    </AuthShell>
  );
}
