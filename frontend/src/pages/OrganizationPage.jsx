import {
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Network,
  ShieldCheck,
  UserRoundCheck,
  UsersRound
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';

const roleTone = {
  'Super Admin': 'bg-slate-900 text-white dark:bg-white dark:text-slate-950',
  Admin: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  'Department Head': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  'Department Manager': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  'Team Leader': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  'Senior Employee': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-200',
  Employee: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200',
  Member: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200',
  Intern: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200'
};

const flattenTree = (nodes) =>
  nodes.flatMap((node) => [node, ...flattenTree(node.children || [])]);

function OrgNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const children = node.children || [];
  const hasChildren = children.length > 0;

  return (
    <div className="relative">
      <article className="panel rounded-lg p-4">
        <div className="flex items-start gap-3">
          <button
            className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:border-slate-800 dark:hover:bg-slate-900"
            onClick={() => setExpanded((value) => !value)}
            disabled={!hasChildren}
            aria-label={expanded ? 'Collapse employee branch' : 'Expand employee branch'}
          >
            {hasChildren ? expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} /> : <UserRoundCheck size={16} />}
          </button>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-marine text-sm font-black text-white">
            {node.name?.[0] || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-black">{node.name}</h2>
              <span className={`badge ${roleTone[node.role] || roleTone.Employee}`}>{node.role || 'Employee'}</span>
            </div>
            <p className="mt-1 truncate text-sm text-slate-500">{node.designation || node.title || 'Team member'}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-900">
                <GitBranch size={13} /> Level {node.hierarchyLevel ?? depth}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-900">
                <UsersRound size={13} /> {children.length} reports
              </span>
            </div>
          </div>
        </div>
      </article>

      {expanded && hasChildren ? (
        <div className="ml-5 mt-3 space-y-3 border-l border-slate-200 pl-4 dark:border-slate-800">
          {children.map((child) => (
            <OrgNode key={child._id} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function OrganizationPage() {
  const [tree, setTree] = useState(null);
  const [structure, setStructure] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [view, setView] = useState('departments');
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '', departmentHead: '', description: '' });
  const [teamForm, setTeamForm] = useState({ name: '', department: '', lead: '' });
  const [moveForm, setMoveForm] = useState({ employeeId: '', departmentId: '', teamId: '' });
  const currentUser = useSelector((state) => state.auth.user);
  const canManage = ['Super Admin', 'Admin', 'Department Head', 'Department Manager', 'Team Leader'].includes(currentUser?.role);

  const load = async () => {
    try {
      const [treeResponse, structureResponse, dashboardResponse, departmentResponse, userResponse, teamResponse] = await Promise.all([
        api.get('/organization/tree'),
        api.get('/organization/structure'),
        api.get('/organization/dashboard'),
        api.get('/organization/departments'),
        api.get('/users', { params: { limit: 100 } }),
        api.get('/organization/teams')
      ]);
      setTree(treeResponse.data.items);
      setStructure(structureResponse.data.items);
      setDashboard(dashboardResponse.data);
      setDepartments(departmentResponse.data.items);
      setUsers(userResponse.data.items);
      setTeams(teamResponse.data.items);
    } catch (error) {
      toast.error('Unable to load organization data');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createDepartment = async (event) => {
    event.preventDefault();
    await api.post('/organization/departments', departmentForm);
    setDepartmentForm({ name: '', code: '', departmentHead: '', description: '' });
    toast.success('Department created');
    load();
  };

  const createTeam = async (event) => {
    event.preventDefault();
    await api.post('/organization/teams', teamForm);
    setTeamForm({ name: '', department: '', lead: '' });
    toast.success('Team created');
    load();
  };

  const assignDepartment = async () => {
    if (!moveForm.employeeId || !moveForm.departmentId) return;
    await api.patch('/organization/assign-department', {
      employeeId: moveForm.employeeId,
      departmentId: moveForm.departmentId
    });
    toast.success('Employee assigned to department');
    load();
  };

  const transferTeam = async () => {
    if (!moveForm.employeeId || !moveForm.teamId) return;
    await api.patch('/organization/transfer-team', {
      employeeId: moveForm.employeeId,
      teamId: moveForm.teamId
    });
    toast.success('Employee transferred to team');
    load();
  };

  const employees = useMemo(() => (tree ? flattenTree(tree) : []), [tree]);
  const leaders = employees.filter((employee) =>
    ['Super Admin', 'Admin', 'Department Head', 'Department Manager', 'Team Leader'].includes(employee.role)
  ).length;

  if (!tree || !dashboard) {
    return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-36" />)}</div>;
  }

  const stats = [
    { label: 'Employees', value: dashboard.employees ?? employees.length, icon: UsersRound, color: 'bg-marine' },
    { label: 'Departments', value: dashboard.departments ?? departments.length, icon: Building2, color: 'bg-jade' },
    { label: 'Leaders', value: leaders, icon: ShieldCheck, color: 'bg-slate-900 dark:bg-slate-200 dark:text-slate-900' },
    { label: 'Approvals', value: dashboard.pendingApprovals ?? 0, icon: BriefcaseBusiness, color: 'bg-coral' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black">Organization</h1>
          <p className="text-sm text-slate-500">Company hierarchy, reporting lines, departments, and manager workload.</p>
        </div>
        <button className="btn-ghost" onClick={load}>
          <Network size={16} /> Refresh structure
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="panel rounded-lg p-5">
            <div className="flex items-center justify-between">
              <span className={`grid h-11 w-11 place-items-center rounded-md text-white ${color}`}><Icon size={20} /></span>
              <span className="text-3xl font-black">{value}</span>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
          </article>
        ))}
      </section>

      <section className="panel rounded-lg p-2">
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { key: 'departments', label: 'Departments', icon: Building2 },
            { key: 'teams', label: 'Teams', icon: UsersRound },
            { key: 'reporting', label: 'Reporting Tree', icon: GitBranch }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                view === key ? 'bg-marine text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
              }`}
              onClick={() => setView(key)}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </section>

      {canManage ? (
        <section className="grid gap-4 xl:grid-cols-3">
          <form onSubmit={createDepartment} className="panel grid gap-3 rounded-lg p-4">
            <h2 className="font-black">Create Department</h2>
            <input className="input" placeholder="Department name" value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} required />
            <input className="input" placeholder="Code" value={departmentForm.code} onChange={(event) => setDepartmentForm({ ...departmentForm, code: event.target.value.toUpperCase() })} required maxLength={16} />
            <select className="input" value={departmentForm.departmentHead} onChange={(event) => setDepartmentForm({ ...departmentForm, departmentHead: event.target.value })}>
              <option value="">Department head</option>
              {users.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.role}</option>)}
            </select>
            <textarea className="input" placeholder="Description" value={departmentForm.description} onChange={(event) => setDepartmentForm({ ...departmentForm, description: event.target.value })} />
            <button className="btn-primary">Create department</button>
          </form>

          <form onSubmit={createTeam} className="panel grid gap-3 rounded-lg p-4">
            <h2 className="font-black">Create Team</h2>
            <input className="input" placeholder="Team name" value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} required />
            <select className="input" value={teamForm.department} onChange={(event) => setTeamForm({ ...teamForm, department: event.target.value })}>
              <option value="">Department</option>
              {departments.map((department) => <option key={department._id} value={department._id}>{department.departmentName || department.name}</option>)}
            </select>
            <select className="input" value={teamForm.lead} onChange={(event) => setTeamForm({ ...teamForm, lead: event.target.value })}>
              <option value="">Team lead</option>
              {users.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.role}</option>)}
            </select>
            <button className="btn-primary">Create team</button>
          </form>

          <div className="panel grid gap-3 rounded-lg p-4">
            <h2 className="font-black">Move Employee</h2>
            <select className="input" value={moveForm.employeeId} onChange={(event) => setMoveForm({ ...moveForm, employeeId: event.target.value })}>
              <option value="">Employee</option>
              {users.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.role}</option>)}
            </select>
            <select className="input" value={moveForm.departmentId} onChange={(event) => setMoveForm({ ...moveForm, departmentId: event.target.value })}>
              <option value="">Department</option>
              {departments.map((department) => <option key={department._id} value={department._id}>{department.departmentName || department.name}</option>)}
            </select>
            <button className="btn-ghost" onClick={assignDepartment} type="button">Assign department</button>
            <select className="input" value={moveForm.teamId} onChange={(event) => setMoveForm({ ...moveForm, teamId: event.target.value })}>
              <option value="">Team</option>
              {teams.map((team) => <option key={team._id} value={team._id}>{team.teamName || team.name}</option>)}
            </select>
            <button className="btn-primary" onClick={transferTeam} type="button">Transfer team</button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        {view === 'departments' ? (
          <div className="space-y-4">
            <div>
              <h2 className="font-black">Department Structure</h2>
              <p className="text-sm text-slate-500">Departments group managers, teams, members, and active project ownership.</p>
            </div>
            <div className="space-y-4">
              {structure.map((department) => (
                <article key={department._id} className="panel rounded-lg p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="grid h-10 w-10 place-items-center rounded-md bg-jade text-white"><Building2 size={18} /></span>
                        <div>
                          <Link to={`/departments/${department._id}`} className="font-black hover:text-marine">{department.departmentName || department.name}</Link>
                          <p className="text-sm text-slate-500">{department.description || 'No department description yet.'}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-500">
                        Head: <span className="font-semibold text-slate-700 dark:text-slate-200">{department.departmentHead?.name || department.manager?.name || 'Unassigned'}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <span className="rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-900"><b>{department.metrics?.memberCount || 0}</b><br />Members</span>
                      <span className="rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-900"><b>{department.metrics?.teamCount || 0}</b><br />Teams</span>
                      <span className="rounded-md bg-slate-100 px-3 py-2 dark:bg-slate-900"><b>{department.metrics?.projectCount || 0}</b><br />Projects</span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {(department.teams || []).map((team) => (
                      <div key={team._id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Link to={`/teams/${team._id}`} className="font-bold hover:text-marine">{team.teamName || team.name}</Link>
                            <p className="text-sm text-slate-500">Lead: {team.teamLead?.name || team.lead?.name || 'Unassigned'}</p>
                          </div>
                          <span className="badge bg-blue-50 text-marine dark:bg-blue-950 dark:text-blue-200">{team.members?.length || 0} members</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {view === 'teams' ? (
          <div className="space-y-4">
            <div>
              <h2 className="font-black">Team Relationships</h2>
              <p className="text-sm text-slate-500">Team leads, members, assigned projects, and department ownership.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {structure.flatMap((department) =>
                (department.teams || []).map((team) => (
                  <Link key={team._id} to={`/teams/${team._id}`} className="panel rounded-lg p-5 transition hover:bg-slate-50 dark:hover:bg-slate-900">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-md bg-marine text-white"><UsersRound size={18} /></span>
                      <div className="min-w-0">
                        <h2 className="truncate font-black">{team.teamName || team.name}</h2>
                        <p className="text-sm text-slate-500">{department.departmentName || department.name}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">Lead: <b className="text-slate-700 dark:text-slate-200">{team.teamLead?.name || team.lead?.name || 'Unassigned'}</b></p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(team.members || []).slice(0, 8).map((member) => (
                        <span key={member._id} className="badge bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">{member.name}</span>
                      ))}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        ) : null}

        {view === 'reporting' ? (
          <div className="space-y-4">
            <div>
              <h2 className="font-black">Reporting Tree</h2>
              <p className="text-sm text-slate-500">Expand branches to inspect each manager's direct and indirect reports.</p>
            </div>
            <div className="space-y-3">
              {tree.map((root) => (
                <OrgNode key={root._id} node={root} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <section className="panel rounded-lg p-5">
            <h2 className="font-black">Role Distribution</h2>
            <div className="mt-4 space-y-3">
              {(dashboard.byRole || []).map((item) => (
                <div key={item._id || 'Unknown'} className="flex items-center justify-between gap-3 text-sm">
                  <span className={`badge ${roleTone[item._id] || roleTone.Employee}`}>{item._id || 'Unassigned'}</span>
                  <span className="font-black">{item.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel rounded-lg p-5">
            <h2 className="font-black">Workload</h2>
            <div className="mt-4 space-y-3">
              {(dashboard.workload || []).map((item) => (
                <div key={item._id || item.name} className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">{item.name}</span>
                    <span>{item.completed}/{item.total}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-jade"
                      style={{ width: `${item.total ? Math.round((item.completed / item.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
