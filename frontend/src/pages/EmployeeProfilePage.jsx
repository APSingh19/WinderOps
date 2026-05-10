import { ArrowLeft, BriefcaseBusiness, Building2, CheckCircle2, GitBranch, ListTodo, Mail, Pencil, Save, UserRoundCheck, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { setUser } from '../store/authSlice.js';

const statusTone = {
  Todo: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200',
  'In Progress': 'bg-blue-50 text-marine dark:bg-blue-950 dark:text-blue-200',
  Review: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
};

const roles = ['Admin', 'Department Head', 'Department Manager', 'Team Leader', 'Senior Employee', 'Employee', 'Member', 'Intern'];
const managerRoles = ['Super Admin', 'Admin', 'Department Head', 'Department Manager', 'Team Leader'];

const Field = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
    <div className="mt-1">{children}</div>
    {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
  </label>
);

const profileFormFromUser = (user = {}) => ({
  name: user.name || '',
  email: user.email || '',
  role: user.role || 'Employee',
  title: user.title || '',
  designation: user.designation || '',
  workRole: user.workRole || '',
  employmentType: user.employmentType || 'Full-time',
  managerId: user.managerId?._id || user.reportingManager?._id || '',
  teamLeadId: user.teamLeadId?._id || user.teamLead?._id || '',
  bio: user.bio || '',
  skills: (user.skills || []).join(', '),
  weeklyCapacityHours: user.weeklyCapacityHours ?? 40,
  maxActiveTasks: user.maxActiveTasks ?? 8
});

export function EmployeeProfilePage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const [data, setData] = useState(null);
  const [people, setPeople] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(profileFormFromUser());

  useEffect(() => {
    api.get(`/users/${id}`).then((response) => {
      setData(response.data);
      setForm(profileFormFromUser(response.data.user));
    });
  }, [id]);

  const isOwnProfile = currentUser?._id === id;
  const canManageProfiles = managerRoles.includes(currentUser?.role);
  const canEdit = isOwnProfile || canManageProfiles;

  useEffect(() => {
    if (!canEdit) return;
    api.get('/users', { params: { limit: 200 } }).then((response) => setPeople(response.data.items));
  }, [canEdit]);

  const stats = useMemo(() => {
    const map = new Map((data?.stats || []).map((item) => [item._id, item.count]));
    return {
      total: [...map.values()].reduce((sum, count) => sum + count, 0),
      completed: map.get('Completed') || 0,
      review: map.get('Review') || 0
    };
  }, [data]);

  if (!data) return <Skeleton className="h-[42rem]" />;

  const { user } = data;
  const department = user.department || user.departmentId;
  const manager = user.managerId || user.reportingManager;
  const teamLead = user.teamLeadId || user.teamLead;

  const saveProfile = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      weeklyCapacityHours: Number(form.weeklyCapacityHours),
      maxActiveTasks: Number(form.maxActiveTasks),
      managerId: form.managerId || undefined,
      teamLeadId: form.teamLeadId || undefined,
      skills: form.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)
    };
    const endpoint = isOwnProfile ? '/users/me/profile' : `/users/${id}`;
    const { data: updatedUser } = await api.patch(endpoint, payload);
    setData((value) => ({ ...value, user: updatedUser }));
    setForm(profileFormFromUser(updatedUser));
    if (isOwnProfile) dispatch(setUser(updatedUser));
    setIsEditing(false);
    toast.success('Profile updated');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/team" className="btn-ghost"><ArrowLeft size={16} /> Team</Link>
        <div className="flex gap-2">
          {canEdit ? (
            <button className="btn-ghost" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? <X size={16} /> : <Pencil size={16} />}
              {isEditing ? 'Cancel' : 'Edit profile'}
            </button>
          ) : null}
          <Link to="/organization" className="btn-ghost"><GitBranch size={16} /> Organization</Link>
        </div>
      </div>

      <section className="panel rounded-lg p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg bg-marine text-3xl font-black text-white">
              {user.name?.[0] || 'U'}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-black">{user.name}</h1>
                <span className="badge bg-blue-50 text-marine dark:bg-blue-950 dark:text-blue-200">{user.role}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{user.designation || user.title || 'Team member'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1"><Mail size={15} /> {user.email}</span>
                {user.employeeId ? <span>Employee ID: {user.employeeId}</span> : null}
                {user.employmentType ? <span>{user.employmentType}</span> : null}
              </div>
            </div>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:w-[30rem]">
            <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{stats.total}</b><br />Tasks</span>
            <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{stats.completed}</b><br />Completed</span>
            <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{data.projects?.length || 0}</b><br />Projects</span>
          </div>
        </div>
      </section>

      {canEdit && isEditing ? (
        <form onSubmit={saveProfile} className="panel rounded-lg p-5">
          <div>
            <h2 className="font-black">Edit Profile</h2>
            <p className="mt-1 text-sm text-slate-500">Update employee details used on profile cards, project assignments, and organization views.</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Full name" hint="Employee display name.">
              <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </Field>
            <Field label="Email address" hint="Used for login and profile contact.">
              <input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </Field>
            {canManageProfiles && !isOwnProfile ? (
              <Field label="Role" hint="Controls permissions and hierarchy level.">
                <select className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                  {roles.map((role) => <option key={role}>{role}</option>)}
                </select>
              </Field>
            ) : null}
            <Field label="Job title" hint="Short public title.">
              <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </Field>
            <Field label="Designation" hint="Official designation or level.">
              <input className="input" value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} />
            </Field>
            <Field label="Work role" hint="Primary responsibility.">
              <input className="input" value={form.workRole} onChange={(event) => setForm({ ...form, workRole: event.target.value })} />
            </Field>
            {canManageProfiles && !isOwnProfile ? (
              <>
                <Field label="Employment type" hint="Contract type for this employee.">
                  <select className="input" value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value })}>
                    {['Full-time', 'Part-time', 'Contract', 'Internship', 'Consultant'].map((type) => <option key={type}>{type}</option>)}
                  </select>
                </Field>
                <Field label="Reporting manager" hint="Direct manager in the org chart.">
                  <select className="input" value={form.managerId} onChange={(event) => setForm({ ...form, managerId: event.target.value })}>
                    <option value="">No reporting manager</option>
                    {people.filter((person) => person._id !== id).map((person) => <option key={person._id} value={person._id}>{person.name} - {person.role}</option>)}
                  </select>
                </Field>
                <Field label="Team lead" hint="Operational lead for task routing.">
                  <select className="input" value={form.teamLeadId} onChange={(event) => setForm({ ...form, teamLeadId: event.target.value })}>
                    <option value="">No team lead</option>
                    {people.filter((person) => person._id !== id).map((person) => <option key={person._id} value={person._id}>{person.name} - {person.role}</option>)}
                  </select>
                </Field>
              </>
            ) : null}
            <Field label="Weekly capacity hours" hint="Available work hours per week.">
              <input className="input" type="number" min="0" max="168" value={form.weeklyCapacityHours} onChange={(event) => setForm({ ...form, weeklyCapacityHours: event.target.value })} />
            </Field>
            <Field label="Maximum active tasks" hint="Task load before capacity warnings.">
              <input className="input" type="number" min="1" max="100" value={form.maxActiveTasks} onChange={(event) => setForm({ ...form, maxActiveTasks: event.target.value })} />
            </Field>
            <Field label="Skills" hint="Separate skills with commas." className="md:col-span-2">
              <input className="input" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
            </Field>
            <Field label="Bio" hint={`${form.bio.length}/280 characters`} className="md:col-span-2 xl:col-span-4">
              <textarea className="input min-h-28" maxLength={280} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn-primary"><Save size={16} /> Save profile</button>
          </div>
        </form>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <article className="panel rounded-lg p-5">
            <h2 className="font-black">Company Placement</h2>
            <div className="mt-4 space-y-3 text-sm">
              <p className="flex items-center gap-2"><Building2 size={16} /> Department: <b>{department?.departmentName || department?.name || 'Unassigned'}</b></p>
              <p className="flex items-center gap-2"><UserRoundCheck size={16} /> Manager: <b>{manager?.name || 'Unassigned'}</b></p>
              <p className="flex items-center gap-2"><UsersRound size={16} /> Team Lead: <b>{teamLead?.name || 'Unassigned'}</b></p>
              <p className="flex items-center gap-2"><GitBranch size={16} /> Hierarchy Level: <b>{user.hierarchyLevel ?? 'N/A'}</b></p>
            </div>
          </article>

          <article className="panel rounded-lg p-5">
            <h2 className="font-black">Reporting Chain</h2>
            <div className="mt-4 space-y-2">
              {(data.reportingChain || []).length === 0 ? <p className="text-sm text-slate-500">No manager chain available.</p> : null}
              {(data.reportingChain || []).map((person) => (
                <div key={person._id} className="rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-900">
                  <b>{person.name}</b>
                  <p className="text-slate-500">{person.role} {person.designation ? `- ${person.designation}` : ''}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel rounded-lg p-5">
            <h2 className="font-black">Direct Reports</h2>
            <div className="mt-4 space-y-2">
              {(data.directReports || []).length === 0 ? <p className="text-sm text-slate-500">No direct reports.</p> : null}
              {(data.directReports || []).map((person) => (
                <Link key={person._id} to={`/team/${person._id}`} className="block rounded-md bg-slate-100 p-3 text-sm transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800">
                  <b>{person.name}</b>
                  <p className="text-slate-500">{person.role} {person.designation ? `- ${person.designation}` : ''}</p>
                </Link>
              ))}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className="panel rounded-lg p-5">
            <h2 className="font-black">Assigned Projects</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(data.projects || []).map((project) => (
                <Link key={project._id} to={`/projects/${project._id}`} className="rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  <span className="badge text-white" style={{ background: project.color }}>{project.key}</span>
                  <h3 className="mt-3 font-bold">{project.name}</h3>
                  <p className="text-sm text-slate-500">{project.status}</p>
                </Link>
              ))}
              {(data.projects || []).length === 0 ? <p className="text-sm text-slate-500">No assigned projects.</p> : null}
            </div>
          </article>

          <article className="panel rounded-lg p-5">
            <h2 className="font-black">Recent Tasks</h2>
            <div className="mt-4 space-y-3">
              {(data.tasks || []).map((task) => (
                <div key={task._id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">{task.title}</h3>
                    <span className={`badge ${statusTone[task.status] || statusTone.Todo}`}>{task.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    <ListTodo className="mr-1 inline" size={14} /> {task.project?.name || 'Project'}
                    {task.status === 'Completed' ? <CheckCircle2 className="ml-2 inline text-emerald-600" size={14} /> : null}
                  </p>
                </div>
              ))}
              {(data.tasks || []).length === 0 ? <p className="text-sm text-slate-500">No recent tasks.</p> : null}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
