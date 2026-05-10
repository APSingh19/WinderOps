import { BarChart3, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client.js';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { getName } from '../utils/enterprise.js';

const defaultForm = { name: '', key: '', description: '', status: 'Active', color: '#2563eb' };

export function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [risk, setRisk] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', department: '', team: '' });
  const [form, setForm] = useState(defaultForm);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [projectResponse, departmentResponse, teamResponse, riskResponse] = await Promise.all([
      api.get('/projects', { params: filters }),
      api.get('/organization/departments'),
      api.get('/organization/teams'),
      api.get('/analytics/projects/risk')
    ]);
    setProjects(projectResponse.data.items);
    setDepartments(departmentResponse.data.items);
    setTeams(teamResponse.data.items);
    setRisk(riskResponse.data.items);
  };

  useEffect(() => {
    load();
  }, [filters.status, filters.department, filters.team]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const departmentId = project.department?._id || project.department;
      const teamId = project.assignedTeam?._id || project.assignedTeam;
      return (!filters.department || departmentId === filters.department) && (!filters.team || teamId === filters.team);
    });
  }, [projects, filters.department, filters.team]);

  const timelineData = filteredProjects.map((project) => ({
    name: project.key,
    members: project.members?.length || 0,
    progress: project.status === 'Completed' ? 100 : project.status === 'Active' ? 64 : project.status === 'On Hold' ? 34 : 18
  }));

  const submit = async (event) => {
    event.preventDefault();
    const { data } = await api.post('/projects', form);
    setProjects([data, ...projects]);
    setForm(defaultForm);
    setShowForm(false);
    toast.success('Project created');
  };

  const remove = async (id) => {
    await api.delete(`/projects/${id}`);
    setProjects(projects.filter((project) => project._id !== id));
    toast.success('Project deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black">Projects</h1>
          <p className="text-sm text-slate-500">Department-owned projects, team assignments, progress tracking, and portfolio analytics.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((value) => !value)}><Plus size={16} /> New project</button>
      </div>

      <section className="panel rounded-lg p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_repeat(3,13rem)_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input className="input pl-10" placeholder="Search projects" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && load()} />
          </label>
          <select className="input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">All statuses</option>
            <option>Planning</option>
            <option>Active</option>
            <option>On Hold</option>
            <option>Completed</option>
          </select>
          <select className="input" value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })}>
            <option value="">All departments</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{getName(department)}</option>)}
          </select>
          <select className="input" value={filters.team} onChange={(event) => setFilters({ ...filters, team: event.target.value })}>
            <option value="">All teams</option>
            {teams.map((team) => <option key={team._id} value={team._id}>{getName(team)}</option>)}
          </select>
          <button className="btn-ghost" onClick={load}><SlidersHorizontal size={16} /> Apply</button>
        </div>
      </section>

      {showForm ? (
        <form onSubmit={submit} className="panel grid gap-4 rounded-lg p-4 md:grid-cols-5">
          <input className="input md:col-span-2" placeholder="Project name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          <input className="input" placeholder="Key" value={form.key} onChange={(event) => setForm({ ...form, key: event.target.value.toUpperCase() })} required maxLength={12} />
          <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option>Planning</option>
            <option>Active</option>
            <option>On Hold</option>
            <option>Completed</option>
          </select>
          <input className="input h-10" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
          <textarea className="input md:col-span-5" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <div className="md:col-span-5 flex justify-end">
            <button className="btn-primary">Create project</button>
          </div>
        </form>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="panel rounded-lg p-5">
          <h2 className="flex items-center gap-2 font-black"><BarChart3 size={18} /> Portfolio timeline</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="progress" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <aside className="panel rounded-lg p-5">
          <h2 className="font-black">Project risk</h2>
          <div className="mt-4 space-y-3 text-sm">
            {risk.slice().sort((a, b) => b.riskScore - a.riskScore).slice(0, 5).map((project) => (
              <Link key={project._id} to={`/projects/${project._id}`} className="block rounded-md bg-slate-100 p-3 transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800">
                <div className="flex justify-between gap-3"><b>{project.key}</b><span>{project.riskLevel}</span></div>
                <p className="mt-1 text-slate-500">{project.overdueRatio}% overdue, {project.blockedTasks} blocked, score {project.riskScore}</p>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      {filteredProjects.length === 0 ? (
        <EmptyState title="No projects found" message="Create a project to start building the board, team, and analytics views." />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <article key={project._id} className="panel rounded-lg p-5">
              <div className="mb-5 flex items-start justify-between gap-3">
                <Link to={`/projects/${project._id}`} className="min-w-0">
                  <span className="badge text-white" style={{ background: project.color }}>{project.key}</span>
                  <h2 className="mt-3 truncate text-lg font-black">{project.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{project.description || 'No description added.'}</p>
                </Link>
                <button className="btn-ghost px-2" onClick={() => remove(project._id)} aria-label="Delete project"><Trash2 size={16} /></button>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{project.status}</span>
                <span>{project.department?.name || project.assignedTeam?.name || `${project.members?.length || 0} members`}</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
