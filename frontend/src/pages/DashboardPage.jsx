import { AlertTriangle, Building2, CheckCircle2, FolderKanban, ListTodo, Network, ShieldCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';

const statCards = [
  { key: 'totalProjects', label: 'Total Projects', icon: FolderKanban, color: 'bg-blue-600', to: '/projects' },
  { key: 'totalTasks', label: 'Total Tasks', icon: ListTodo, color: 'bg-slate-900 dark:bg-slate-200 dark:text-slate-900', to: '/tasks' },
  { key: 'departments', label: 'Departments', icon: Building2, color: 'bg-jade', to: '/departments' },
  { key: 'teams', label: 'Teams', icon: UsersRound, color: 'bg-berry', to: '/teams' },
  { key: 'employees', label: 'Employees', icon: Network, color: 'bg-coral', to: '/employees' },
  { key: 'completedTasks', label: 'Completed Tasks', icon: CheckCircle2, color: 'bg-emerald-600', to: '/analytics' },
  { key: 'overdueTasks', label: 'Overdue Tasks', icon: AlertTriangle, color: 'bg-orange-600', to: '/tasks' }
];

const colors = ['#2563eb', '#f97316', '#0f766e', '#be185d'];

export function DashboardPage() {
  const [data, setData] = useState(null);
  const [enterprise, setEnterprise] = useState(null);
  const [departmentPerformance, setDepartmentPerformance] = useState([]);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/enterprise-overview'),
      api.get('/analytics/departments/performance')
    ]).then(([dashboardResponse, enterpriseResponse, departmentResponse]) => {
      setEnterprise(enterpriseResponse.data);
      setDepartmentPerformance(departmentResponse.data.items);
      setData({
        ...dashboardResponse.data,
        departments: enterpriseResponse.data.departments,
        employees: enterpriseResponse.data.employees,
        teams: enterpriseResponse.data.teams
      });
    });
  }, []);

  if (!data) {
    return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-40" />)}</div>;
  }

  const statusData = data.byStatus.map((item) => ({ name: item._id, value: item.count }));
  const priorityData = data.byPriority.map((item) => ({ name: item._id, count: item.count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Overview Dashboard</h1>
        <p className="text-sm text-slate-500">Enterprise command center for departments, projects, tasks, people, delivery, and risk.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, color, to }) => (
          <Link key={key} to={to} className="panel rounded-lg p-5 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg dark:hover:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className={`grid h-11 w-11 place-items-center rounded-md text-white ${color}`}><Icon size={20} /></span>
              <span className="text-3xl font-black">{data[key]}</span>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel rounded-lg p-5">
          <h2 className="mb-4 font-bold">Team productivity</h2>
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={data.productivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="completed" name="Completed" fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="total" name="Total" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel rounded-lg p-5">
          <h2 className="mb-4 font-bold">Task status</h2>
          <div className="h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={110} paddingAngle={4}>
                  {statusData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {priorityData.map((item, index) => (
              <span key={item.name} className="rounded-md bg-slate-100 px-3 py-2 text-sm dark:bg-slate-900">
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: colors[index % colors.length] }} />
                {item.name}: {item.count}
              </span>
            ))}
          </div>
        </div>
      </section>

      {enterprise ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="panel rounded-lg p-5">
            <h2 className="flex items-center gap-2 font-black"><ShieldCheck size={18} /> Role-based command view</h2>
            <p className="mt-2 text-sm text-slate-500">
              {user?.role === 'Employee'
                ? 'Your dashboard focuses on personal workload, assigned work, and reporting structure.'
                : user?.role === 'Team Leader'
                  ? 'Your dashboard focuses on team tasks, approvals, employee capacity, and blocked work.'
                  : user?.role?.includes('Department')
                    ? 'Your dashboard focuses on department delivery, team performance, and project risk.'
                    : 'Your dashboard covers the full company, all departments, enterprise risk, and leadership analytics.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Link to="/tasks" className="rounded-md bg-slate-100 p-3 transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"><b>{enterprise.pendingApprovals}</b><br />Pending approvals</Link>
              <Link to="/tasks" className="rounded-md bg-slate-100 p-3 transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"><b>{enterprise.overdueTasks}</b><br />Overdue tasks</Link>
              <Link to="/projects" className="rounded-md bg-slate-100 p-3 transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"><b>{enterprise.activeProjects}</b><br />Active projects</Link>
              <Link to="/analytics" className="rounded-md bg-slate-100 p-3 transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"><b>{enterprise.performanceScore}%</b><br />Org score</Link>
            </div>
          </article>

          <article className="panel rounded-lg p-5">
            <h2 className="font-black">Department performance ranking</h2>
            <div className="mt-4 space-y-3">
              {departmentPerformance.slice().sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 6).map((department) => (
                <Link key={department._id} to={`/departments/${department._id}`} className="block rounded-md bg-slate-100 p-3 transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">{department.name}</span>
                    <span className="font-black">{department.performanceScore}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-marine" style={{ width: `${department.performanceScore}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
