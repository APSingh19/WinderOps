import { ArrowLeft, BriefcaseBusiness, Building2, CalendarDays, Filter, FolderKanban, Megaphone, Plus, Search, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { buildDepartmentMetrics, canManageOrg, getName } from '../utils/enterprise.js';

const defaultProjectForm = { name: '', key: '', description: '', status: 'Active', color: '#2563eb' };

export function DepartmentDetailPage() {
  const { id } = useParams();
  const currentUser = useSelector((state) => state.auth.user);
  const [department, setDepartment] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [teamForm, setTeamForm] = useState({ name: '', lead: '', members: [] });
  const [projectForm, setProjectForm] = useState(defaultProjectForm);
  const canManage = canManageOrg(currentUser?.role);

  const load = async () => {
    const requests = [
      api.get(`/organization/departments/${id}/structure`),
      api.get('/tasks', { params: { department: id, limit: 100 } }),
      api.get('/analytics/departments/performance')
    ];
    if (canManage) {
      requests.push(
        api.get('/users', { params: { limit: 200 } }),
        api.get('/organization/teams', { params: { limit: 200 } }),
        api.get('/projects', { params: { limit: 200 } })
      );
    }
    const [departmentResponse, taskResponse, performanceResponse, userResponse, teamResponse, projectResponse] = await Promise.all(requests);
    setDepartment(departmentResponse.data);
    setTasks(taskResponse.data.items);
    setPerformance(performanceResponse.data.items.find((item) => item._id === id));
    if (userResponse) setUsers(userResponse.data.items);
    if (teamResponse) setTeams(teamResponse.data.items);
    if (projectResponse) setProjects(projectResponse.data.items);
  };

  useEffect(() => {
    load();
  }, [id]);

  const roleData = useMemo(() => {
    const counts = new Map();
    (department?.members || []).forEach((member) => counts.set(member.role || 'Employee', (counts.get(member.role || 'Employee') || 0) + 1));
    return [...counts.entries()].map(([role, count]) => ({ role, count }));
  }, [department]);

  const filteredMembers = useMemo(() => {
    const members = department?.members || [];
    return members.filter((member) => {
      const matchesSearch = member.name.toLowerCase().includes(search.toLowerCase()) || member.role?.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = !teamFilter || (department.teams || []).some((team) => team._id === teamFilter && team.members?.some((teamMember) => teamMember._id === member._id));
      return matchesSearch && matchesTeam;
    });
  }, [department, search, teamFilter]);

  if (!department) return <Skeleton className="h-[42rem]" />;

  const memberIds = new Set((department.members || []).map((member) => member._id));
  const departmentTeamIds = new Set((department.teams || []).map((team) => team._id));
  const departmentProjectIds = new Set((department.projects || []).map((project) => project._id));
  const availableUsers = users.filter((user) => !memberIds.has(user._id));
  const availableTeams = teams.filter((team) => !departmentTeamIds.has(team._id));
  const availableProjects = projects.filter((project) => !departmentProjectIds.has(project._id));

  const addEmployee = async (event) => {
    event.preventDefault();
    if (!employeeId) return;
    await api.patch('/organization/assign-department', { employeeId, departmentId: id });
    setEmployeeId('');
    toast.success('Employee added to department');
    load();
  };

  const attachTeam = async (event) => {
    event.preventDefault();
    if (!teamId) return;
    await api.patch(`/organization/teams/${teamId}`, { department: id });
    setTeamId('');
    toast.success('Team added to department');
    load();
  };

  const createTeam = async (event) => {
    event.preventDefault();
    await api.post('/organization/teams', {
      name: teamForm.name,
      teamName: teamForm.name,
      lead: teamForm.lead || undefined,
      department: id,
      members: teamForm.members
    });
    setTeamForm({ name: '', lead: '', members: [] });
    toast.success('Team created in department');
    load();
  };

  const attachProject = async (event) => {
    event.preventDefault();
    if (!projectId) return;
    await api.patch(`/projects/${projectId}`, { department: id });
    setProjectId('');
    toast.success('Project added to department');
    load();
  };

  const createProject = async (event) => {
    event.preventDefault();
    await api.post('/projects', { ...projectForm, department: id });
    setProjectForm(defaultProjectForm);
    toast.success('Project created in department');
    load();
  };

  return (
    <div className="space-y-6">
      <Link to="/departments" className="btn-ghost"><ArrowLeft size={16} /> Departments</Link>

      <section className="panel rounded-lg p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-jade text-white"><Building2 size={28} /></span>
            <div>
              <h1 className="text-2xl font-black">{getName(department)}</h1>
              <p className="mt-1 text-sm text-slate-500">{department.description || 'No department description yet.'}</p>
              <p className="mt-3 text-sm text-slate-500">Head: <b className="text-slate-700 dark:text-slate-200">{department.departmentHead?.name || department.manager?.name || 'Unassigned'}</b></p>
            </div>
          </div>
          <div className="grid gap-2 text-center text-sm sm:grid-cols-3 lg:w-[28rem]">
            <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{buildDepartmentMetrics(department).memberCount}</b><br />Members</span>
            <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{buildDepartmentMetrics(department).teamCount}</b><br />Teams</span>
            <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{buildDepartmentMetrics(department).projectCount}</b><br />Projects</span>
          </div>
        </div>
      </section>

      {canManage ? (
        <section className="grid gap-4 xl:grid-cols-3">
          <article className="panel rounded-lg p-5">
            <h2 className="flex items-center gap-2 font-black"><UserPlus size={18} /> Add employee</h2>
            <form onSubmit={addEmployee} className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Employee</span>
                <select className="input mt-1" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                  <option value="">Choose employee</option>
                  {availableUsers.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.role}</option>)}
                </select>
              </label>
              <button className="btn-primary w-full"><UserPlus size={16} /> Add employee</button>
            </form>
          </article>

          <article className="panel rounded-lg p-5">
            <h2 className="flex items-center gap-2 font-black"><UsersRound size={18} /> Add team</h2>
            <form onSubmit={attachTeam} className="mt-4 grid gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Existing team</span>
                <select className="input mt-1" value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                  <option value="">Choose team</option>
                  {availableTeams.map((team) => <option key={team._id} value={team._id}>{team.teamName || team.name}</option>)}
                </select>
              </label>
              <button className="btn-ghost w-full"><Plus size={16} /> Add existing team</button>
            </form>
            <form onSubmit={createTeam} className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">New team name</span>
                <input className="input mt-1" value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} required />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Team lead</span>
                <select className="input mt-1" value={teamForm.lead} onChange={(event) => setTeamForm({ ...teamForm, lead: event.target.value })}>
                  <option value="">No team lead</option>
                  {users.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.role}</option>)}
                </select>
              </label>
              <button className="btn-primary w-full"><Plus size={16} /> Create team</button>
            </form>
          </article>

          <article className="panel rounded-lg p-5">
            <h2 className="flex items-center gap-2 font-black"><FolderKanban size={18} /> Add project</h2>
            <form onSubmit={attachProject} className="mt-4 grid gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Existing project</span>
                <select className="input mt-1" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                  <option value="">Choose project</option>
                  {availableProjects.map((project) => <option key={project._id} value={project._id}>{project.key} - {project.name}</option>)}
                </select>
              </label>
              <button className="btn-ghost w-full"><Plus size={16} /> Add existing project</button>
            </form>
            <form onSubmit={createProject} className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Project name</span>
                  <input className="input mt-1" value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} required />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Key</span>
                  <input className="input mt-1" maxLength={12} value={projectForm.key} onChange={(event) => setProjectForm({ ...projectForm, key: event.target.value.toUpperCase() })} required />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Description</span>
                <textarea className="input mt-1 min-h-20" value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} />
              </label>
              <button className="btn-primary w-full"><Plus size={16} /> Create project</button>
            </form>
          </article>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[16rem_1fr]">
        <aside className="space-y-4">
          <div className="panel rounded-lg p-4">
            <h2 className="flex items-center gap-2 font-black"><Filter size={18} /> Department</h2>
            <div className="mt-4 space-y-2">
              {['Overview', 'Teams', 'Projects', 'Employees', 'Calendar', 'Activity'].map((item) => (
                <button key={item} className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900">{item}</button>
              ))}
            </div>
          </div>
          <div className="panel rounded-lg p-4">
            <h2 className="flex items-center gap-2 font-black"><Megaphone size={18} /> Announcements</h2>
            <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm text-slate-500 dark:bg-slate-900">Department standup notes and critical announcements can live here.</p>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Delivery performance', value: performance?.performanceScore ?? buildDepartmentMetrics(department).completion, color: 'bg-jade' },
              { label: 'Pending approvals', value: performance?.pendingApprovals ?? 0, color: 'bg-marine' },
              { label: 'Operational risk', value: performance?.riskScore ?? buildDepartmentMetrics(department).risk, color: 'bg-coral' }
            ].map((metric) => (
              <article key={metric.label} className="panel rounded-lg p-5">
                <p className="text-sm font-semibold text-slate-500">{metric.label}</p>
                <p className="mt-2 text-3xl font-black">{metric.value}%</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full rounded-full ${metric.color}`} style={{ width: `${metric.value}%` }} /></div>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
            <article className="panel rounded-lg p-5">
              <h2 className="font-black">Performance trend</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer>
                  <LineChart data={[{ name: 'Week 1', done: 48, load: 62 }, { name: 'Week 2', done: 58, load: 68 }, { name: 'Week 3', done: 66, load: 74 }, { name: 'Current', done: performance?.performanceScore ?? buildDepartmentMetrics(department).completion, load: performance?.tasks ?? buildDepartmentMetrics(department).velocity }]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="done" stroke="#0f766e" strokeWidth={3} />
                    <Line type="monotone" dataKey="load" stroke="#2563eb" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
            <article className="panel rounded-lg p-5">
              <h2 className="font-black">Pending tasks</h2>
              <div className="mt-4 space-y-3">
                {tasks.filter((task) => task.status !== 'Completed').slice(0, 6).map((task) => (
                  <Link key={task._id} to="/tasks" className="block rounded-md bg-slate-100 p-3 text-sm transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800">
                    <b>{task.title}</b>
                    <p className="text-slate-500">{task.status} - {task.assignee?.name || 'Unassigned'}</p>
                  </Link>
                ))}
              </div>
            </article>
          </section>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <article className="panel rounded-lg p-5">
          <h2 className="font-black">Teams</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(department.teams || []).map((team) => (
              <Link key={team._id} to={`/organization/teams/${team._id}`} className="rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{team.teamName || team.name}</h3>
                    <p className="text-sm text-slate-500">Lead: {team.teamLead?.name || team.lead?.name || 'Unassigned'}</p>
                  </div>
                  <UsersRound size={18} />
                </div>
                <p className="mt-3 text-sm text-slate-500">{team.members?.length || 0} members</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel rounded-lg p-5">
          <h2 className="font-black">Role Mix</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={roleData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="role" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="panel rounded-lg p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-black">Employees</h2>
            <div className="grid gap-2 md:grid-cols-[1fr_12rem]">
              <label className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input className="input pl-9" placeholder="Search employees" value={search} onChange={(event) => setSearch(event.target.value)} />
              </label>
              <select className="input" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
                <option value="">All teams</option>
                {(department.teams || []).map((team) => <option key={team._id} value={team._id}>{team.teamName || team.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filteredMembers.map((member) => (
              <Link key={member._id} to={`/employees/${member._id}`} className="rounded-lg bg-slate-100 p-4 text-sm transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800">
                <b>{member.name}</b>
                <p className="text-slate-500">{member.role} {member.designation ? `- ${member.designation}` : ''}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel rounded-lg p-5">
          <h2 className="font-black">Active projects</h2>
          <div className="mt-4 space-y-3">
            {(department.projects || []).map((project) => (
              <Link key={project._id} to={`/projects/${project._id}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                <span><FolderKanban className="mr-2 inline" size={16} /> <b>{project.name}</b></span>
                <span className="badge text-white" style={{ background: project.color || '#2563eb' }}>{project.key || project.status}</span>
              </Link>
            ))}
            {(department.projects || []).length === 0 ? <p className="text-sm text-slate-500"><BriefcaseBusiness className="mr-1 inline" size={15} /> No active projects.</p> : null}
          </div>
        </article>
      </section>

      <section className="panel rounded-lg p-5">
        <h2 className="flex items-center gap-2 font-black"><CalendarDays size={18} /> Department calendar</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {tasks.filter((task) => task.dueDate).slice(0, 8).map((task) => (
            <Link key={task._id} to="/tasks" className="rounded-md bg-blue-50 p-3 text-sm text-marine dark:bg-blue-950 dark:text-blue-200">
              <b>{new Date(task.dueDate).toLocaleDateString()}</b>
              <p className="mt-1">{task.title}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
