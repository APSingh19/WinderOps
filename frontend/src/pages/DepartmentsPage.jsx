import { BarChart3, Building2, Megaphone, Plus, Search, Trash2, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { buildDepartmentMetrics, canManageOrg, departmentPalette, getName } from '../utils/enterprise.js';

const emptyForm = { name: '', code: '', departmentHead: '', description: '' };

export function DepartmentsPage() {
  const [departments, setDepartments] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const currentUser = useSelector((state) => state.auth.user);
  const canManage = canManageOrg(currentUser?.role);

  const load = async () => {
    const [structureResponse, userResponse, performanceResponse] = await Promise.all([
      api.get('/organization/structure'),
      api.get('/users', { params: { limit: 100 } }),
      api.get('/analytics/departments/performance')
    ]);
    setDepartments(structureResponse.data.items);
    setUsers(userResponse.data.items);
    setPerformance(performanceResponse.data.items);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!departments) return [];
    return departments.filter((department) => getName(department).toLowerCase().includes(query.toLowerCase()));
  }, [departments, query]);

  const analytics = filtered.map((department) => ({
    name: getName(department),
    projects: performance.find((item) => item._id === department._id)?.projects ?? buildDepartmentMetrics(department).projectCount,
    employees: performance.find((item) => item._id === department._id)?.employees ?? buildDepartmentMetrics(department).memberCount
  }));

  const submit = async (event) => {
    event.preventDefault();
    await api.post('/organization/departments', form);
    setForm(emptyForm);
    setShowForm(false);
    toast.success('Department created');
    load();
  };

  const remove = async () => {
    await api.delete(`/organization/departments/${pendingDelete._id}`);
    toast.success(`${getName(pendingDelete)} deleted`);
    setPendingDelete(null);
    load();
  };

  if (!departments) {
    return <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-48" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-black">Departments</h1>
          <p className="text-sm text-slate-500">Department ownership, leaders, employees, projects, and operating health.</p>
        </div>
        {canManage ? (
          <button className="btn-primary" onClick={() => setShowForm((value) => !value)}>
            <Plus size={16} /> New department
          </button>
        ) : null}
      </div>

      <section className="panel rounded-lg p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input className="input pl-10" placeholder="Search departments, heads, teams" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <Link to="/organization" className="btn-ghost">
            <UsersRound size={16} /> Organization structure
          </Link>
        </div>
      </section>

      {canManage && showForm ? (
        <form onSubmit={submit} className="panel grid gap-4 rounded-lg p-4 lg:grid-cols-6">
          <input className="input lg:col-span-2" placeholder="Department name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="input" placeholder="Code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required maxLength={16} />
          <select className="input lg:col-span-2" value={form.departmentHead} onChange={(event) => setForm({ ...form, departmentHead: event.target.value })}>
            <option value="">Department head</option>
            {users.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.role}</option>)}
          </select>
          <button className="btn-primary">Create</button>
          <textarea className="input lg:col-span-6" placeholder="Description or department mandate" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </form>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((department, index) => {
            const metrics = buildDepartmentMetrics(department);
            const score = performance.find((item) => item._id === department._id);
            return (
              <article key={department._id} className="panel rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <Link to={`/departments/${department._id}`} className="flex min-w-0 items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md text-white" style={{ background: departmentPalette[index % departmentPalette.length] }}>
                      <Building2 size={20} />
                    </span>
                    <span className="min-w-0">
                      <h2 className="truncate text-lg font-black hover:text-marine">{getName(department)}</h2>
                      <p className="line-clamp-2 text-sm text-slate-500">{department.description || 'No department mandate added yet.'}</p>
                    </span>
                  </Link>
                  {canManage ? <button className="btn-ghost px-2" onClick={() => setPendingDelete(department)} aria-label={`Delete ${getName(department)}`}><Trash2 size={16} /></button> : null}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{score?.employees ?? metrics.memberCount}</b><br />Employees</span>
                  <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{score?.teams ?? metrics.teamCount}</b><br />Teams</span>
                  <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{score?.projects ?? metrics.projectCount}</b><br />Projects</span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm"><span>Performance</span><b>{score?.performanceScore ?? metrics.completion}%</b></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-jade" style={{ width: `${score?.performanceScore ?? metrics.completion}%` }} /></div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span className="rounded-md bg-slate-100 p-2 dark:bg-slate-900">{score?.pendingApprovals ?? 0} approvals</span>
                    <span className="rounded-md bg-slate-100 p-2 dark:bg-slate-900">{score?.overdueTasks ?? 0} overdue</span>
                  </div>
                  <p className="text-sm text-slate-500">Head: <b className="text-slate-700 dark:text-slate-200">{department.departmentHead?.name || department.manager?.name || 'Unassigned'}</b></p>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="space-y-4">
          <section className="panel rounded-lg p-5">
            <h2 className="flex items-center gap-2 font-black"><BarChart3 size={18} /> Department analytics</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer>
                <BarChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} hide />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="employees" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="projects" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="panel rounded-lg p-5">
            <h2 className="flex items-center gap-2 font-black"><Megaphone size={18} /> Announcements</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <p className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">Q2 planning reviews are due from department heads.</p>
              <p className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">Project staffing updates sync into department metrics.</p>
            </div>
          </section>
        </aside>
      </section>
      {pendingDelete ? (
        <ConfirmDialog
          title={`Delete ${getName(pendingDelete)}?`}
          message="This removes the department grouping and unassigns related employees and teams from the department. Project and task history remains intact."
          confirmLabel="Delete department"
          onCancel={() => setPendingDelete(null)}
          onConfirm={remove}
        />
      ) : null}
    </div>
  );
}
