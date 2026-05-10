import { ArrowLeft, FolderKanban, ListTodo, Pencil, UserRoundCheck, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { api } from '../api/client.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';

const colors = ['#2563eb', '#0f766e', '#f97316', '#be185d'];

export function TeamDetailPage() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.get(`/organization/teams/${id}/structure`).then(async (response) => {
      setTeam(response.data);
      const projectIds = (response.data.activeProjects || response.data.assignedProjects || []).map((project) => project._id);
      const taskResponses = await Promise.all(projectIds.slice(0, 4).map((project) => api.get('/tasks', { params: { project, limit: 100 } })));
      setTasks(taskResponses.flatMap((item) => item.data.items));
    });
  }, [id]);

  const statusData = useMemo(() => {
    const counts = new Map();
    tasks.forEach((task) => counts.set(task.status, (counts.get(task.status) || 0) + 1));
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [tasks]);

  if (!team) return <Skeleton className="h-[42rem]" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between gap-3">
        <Link to="/teams" className="btn-ghost"><ArrowLeft size={16} /> Teams</Link>
        <Link to={`/teams/${id}/edit`} className="btn-primary"><Pencil size={16} /> Edit team</Link>
      </div>

      <section className="panel rounded-lg p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-marine text-white"><UsersRound size={28} /></span>
            <div>
              <h1 className="text-2xl font-black">{team.teamName || team.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{team.department?.departmentName || team.department?.name || 'No department assigned'}</p>
              <p className="mt-3 text-sm text-slate-500">Lead: <b className="text-slate-700 dark:text-slate-200">{team.teamLead?.name || team.lead?.name || 'Unassigned'}</b></p>
            </div>
          </div>
          <div className="grid gap-2 text-center text-sm sm:grid-cols-3 lg:w-[28rem]">
            <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{team.members?.length || 0}</b><br />Members</span>
            <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{team.activeProjects?.length || team.assignedProjects?.length || 0}</b><br />Projects</span>
            <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{tasks.length}</b><br />Tasks</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="panel rounded-lg p-5">
          <h2 className="font-black">Task Status</h2>
          <div className="mt-4 h-72">
            {statusData.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={4}>
                    {statusData.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-500"><ListTodo size={18} /> No tasks found</div>
            )}
          </div>
        </article>

        <article className="panel rounded-lg p-5">
          <h2 className="font-black">Members</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(team.members || []).map((member) => (
              <Link key={member._id} to={`/employees/${member._id}`} className="rounded-lg bg-slate-100 p-4 text-sm transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800">
                <b>{member.name}</b>
                <p className="text-slate-500">{member.role} {member.designation ? `- ${member.designation}` : ''}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="panel rounded-lg p-5">
        <h2 className="font-black">Assigned Projects</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(team.activeProjects || team.assignedProjects || []).map((project) => (
            <Link key={project._id} to={`/projects/${project._id}`} className="rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900">
              <span className="badge text-white" style={{ background: project.color || '#2563eb' }}>{project.key}</span>
              <h3 className="mt-3 font-bold"><FolderKanban className="mr-2 inline" size={16} /> {project.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{project.status}</p>
            </Link>
          ))}
          {(team.activeProjects || team.assignedProjects || []).length === 0 ? <p className="text-sm text-slate-500"><UserRoundCheck className="mr-1 inline" size={15} /> No assigned projects.</p> : null}
        </div>
      </section>
    </div>
  );
}
