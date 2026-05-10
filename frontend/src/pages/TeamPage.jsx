import { Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';

const roles = ['Admin', 'Department Head', 'Department Manager', 'Team Leader', 'Senior Employee', 'Employee', 'Intern'];
const managerRoles = ['Super Admin', 'Admin', 'Department Head', 'Department Manager', 'Team Leader'];
const companyAdminRoles = ['Super Admin', 'Admin'];
const defaultForm = { name: '', email: '', password: '', role: 'Employee', title: '', designation: '', managerId: '' };

export function TeamPage({ title = 'Employees', subtitle = 'Profiles, roles, titles, reporting managers, and recent activity.' }) {
  const [users, setUsers] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const currentUser = useSelector((state) => state.auth.user);
  const canManageTeam = managerRoles.includes(currentUser?.role);
  const canDeleteMembers = companyAdminRoles.includes(currentUser?.role);

  const load = async () => {
    const [userResponse, performanceResponse] = await Promise.all([
      api.get('/users', { params: { search, page: pagination.page, limit: 24 } }),
      api.get('/analytics/employees/performance')
    ]);
    setUsers(userResponse.data.items);
    setPagination({ page: userResponse.data.page || 1, pages: userResponse.data.pages || 1, total: userResponse.data.total || userResponse.data.items.length });
    setPerformance(performanceResponse.data.items);
    api.get('/analytics/workload/capacity').then((response) => setCapacity(response.data.items));
  };

  useEffect(() => {
    load();
  }, [pagination.page]);

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      managerId: form.managerId || undefined,
      title: form.title || form.designation || 'Team Member',
      designation: form.designation || form.title || 'Team Member'
    };
    const { data } = await api.post('/users', payload);
    setUsers((items) => [data, ...items]);
    setForm(defaultForm);
    setShowForm(false);
    toast.success('Team member added');
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await api.delete(`/users/${deleteTarget._id}`);
    setUsers((items) => items.filter((item) => item._id !== deleteTarget._id));
    toast.success(`${deleteTarget.name} removed`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {canManageTeam ? (
          <button className="btn-primary" onClick={() => setShowForm((value) => !value)}>
            <UserPlus size={16} /> Add member
          </button>
        ) : null}
      </div>
      <section className="panel rounded-lg p-4">
        <label className="relative block">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Search people" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load()} />
        </label>
      </section>
      {canManageTeam && showForm ? (
        <form onSubmit={submit} className="panel grid gap-4 rounded-lg p-4 md:grid-cols-6">
          <input className="input md:col-span-2" placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="input md:col-span-2" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <input className="input md:col-span-2" placeholder="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <input className="input md:col-span-2" type="password" placeholder="Temporary password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={6} />
          <select className="input md:col-span-2" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            {roles.map((role) => <option key={role}>{role}</option>)}
          </select>
          <input className="input md:col-span-2" placeholder="Designation" value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} />
          <select className="input md:col-span-4" value={form.managerId} onChange={(event) => setForm({ ...form, managerId: event.target.value })}>
            <option value="">No reporting manager</option>
            {users
              .filter((user) => user._id !== currentUser?._id)
              .map((user) => <option key={user._id} value={user._id}>{user.name} - {user.role}</option>)}
          </select>
          <div className="flex justify-end md:col-span-2">
            <button className="btn-primary">Create member</button>
          </div>
        </form>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => (
          <article key={user._id} className="panel rounded-lg p-5">
            {(() => {
              const score = performance.find((item) => item._id === user._id);
              const load = capacity.find((item) => item._id === user._id);
              return (
                <>
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-berry text-xl font-black text-white">{user.name[0]}</div>
              <div className="min-w-0">
                <Link to={`/employees/${user._id}`} className="truncate font-black hover:text-marine">{user.name}</Link>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
                <p className="mt-2 text-sm font-semibold">{user.designation || user.title}</p>
                {user.managerId?.name ? <p className="mt-1 text-xs text-slate-500">Reports to {user.managerId.name}</p> : null}
              </div>
              {canManageTeam && currentUser?._id !== user._id ? (
                <div className="ml-auto flex gap-1">
                  <Link className="btn-ghost px-2" to={`/employees/${user._id}`} aria-label={`Edit ${user.name}`}>
                    <Pencil size={16} />
                  </Link>
                  {canDeleteMembers ? (
                    <button className="btn-ghost px-2" onClick={() => setDeleteTarget(user)} aria-label={`Remove ${user.name}`}>
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <p className="mt-4 line-clamp-3 text-sm text-slate-500">{user.bio || 'No bio yet.'}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <span className="rounded-md bg-slate-100 p-2 dark:bg-slate-900"><b>{score?.assignedTasks ?? 0}</b><br />Tasks</span>
              <span className="rounded-md bg-slate-100 p-2 dark:bg-slate-900"><b>{load?.utilization ?? 0}%</b><br />Capacity</span>
              <span className="rounded-md bg-slate-100 p-2 dark:bg-slate-900"><b>{score?.performanceScore ?? 0}%</b><br />Score</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-jade" style={{ width: `${score?.performanceScore ?? 0}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="badge bg-blue-50 text-marine dark:bg-blue-950 dark:text-blue-200">{user.role}</span>
              {load?.status ? <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">{load.status}</span> : null}
              {(user.skills || []).slice(0, 3).map((skill) => <span key={skill} className="badge bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300">{skill}</span>)}
            </div>
                </>
              );
            })()}
          </article>
        ))}
      </section>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{pagination.total} employees</p>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={pagination.page <= 1} onClick={() => setPagination((value) => ({ ...value, page: value.page - 1 }))}>Previous</button>
          <button className="btn-ghost" disabled={pagination.page >= pagination.pages} onClick={() => setPagination((value) => ({ ...value, page: value.page + 1 }))}>Next</button>
        </div>
      </div>
      {deleteTarget ? (
        <ConfirmDialog
          title="Remove team member?"
          message={`This will remove ${deleteTarget.name} from the workspace and unassign their tasks. This cannot be undone.`}
          confirmLabel="Remove member"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
