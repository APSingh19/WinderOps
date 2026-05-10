import { BarChart3, Building2, CheckCircle2, FolderKanban, ListTodo } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { api } from '../api/client.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { departmentPalette, getName } from '../utils/enterprise.js';

export function AnalyticsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/departments/performance'),
      api.get('/analytics/teams/performance'),
      api.get('/analytics/employees/performance')
    ]).then(([dashboardResponse, departmentResponse, teamResponse, employeeResponse]) => {
      setDashboard(dashboardResponse.data);
      setDepartments(departmentResponse.data.items);
      setTeams(teamResponse.data.items);
      setEmployees(employeeResponse.data.items);
    });
  }, []);

  const departmentData = useMemo(() => departments.map((department) => ({
    name: getName(department),
    teams: department.teams,
    projects: department.projects,
    employees: department.employees,
    score: department.performanceScore
  })), [departments]);

  if (!dashboard) {
    return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-36" />)}</div>;
  }

  const statusData = dashboard.byStatus.map((item) => ({ name: item._id, value: item.count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Reports & Analytics</h1>
        <p className="text-sm text-slate-500">Portfolio delivery, department performance, task flow, and workforce productivity.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Projects', value: dashboard.totalProjects, icon: FolderKanban, tone: 'bg-marine' },
          { label: 'Tasks', value: dashboard.totalTasks, icon: ListTodo, tone: 'bg-slate-900 dark:bg-slate-200 dark:text-slate-900' },
          { label: 'Completed', value: dashboard.completedTasks, icon: CheckCircle2, tone: 'bg-jade' },
          { label: 'Departments', value: departments.length, icon: Building2, tone: 'bg-berry' }
        ].map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className="panel rounded-lg p-5">
            <div className="flex items-center justify-between">
              <span className={`grid h-11 w-11 place-items-center rounded-md text-white ${tone}`}><Icon size={20} /></span>
              <span className="text-3xl font-black">{value}</span>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="panel rounded-lg p-5">
          <h2 className="flex items-center gap-2 font-black"><BarChart3 size={18} /> Department portfolio</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="employees" fill="#2563eb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="projects" fill="#0f766e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="score" fill="#be185d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel rounded-lg p-5">
          <h2 className="font-black">Task status mix</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={68} outerRadius={108}>
                  {statusData.map((entry, index) => <Cell key={entry.name} fill={departmentPalette[index % departmentPalette.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="panel rounded-lg p-5">
        <h2 className="font-black">Employee productivity</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer>
            <LineChart data={employees.slice(0, 10).map((employee) => ({ name: employee.name, completed: employee.completedTasks, total: employee.assignedTasks, score: employee.performanceScore }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="completed" stroke="#0f766e" strokeWidth={3} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} />
              <Line type="monotone" dataKey="score" stroke="#be185d" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="panel rounded-lg p-5">
          <h2 className="font-black">Team performance</h2>
          <div className="mt-4 space-y-3">
            {teams.slice().sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 8).map((team) => (
              <div key={team._id} className="rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-900">
                <div className="flex justify-between gap-3"><b>{team.name}</b><span>{team.performanceScore}%</span></div>
                <p className="mt-1 text-slate-500">{team.tasks} tasks, {team.pendingApprovals} approvals, {team.overdueTasks} overdue</p>
              </div>
            ))}
          </div>
        </article>
        <article className="panel rounded-lg p-5">
          <h2 className="font-black">Employees needing manager attention</h2>
          <div className="mt-4 space-y-3">
            {employees.filter((employee) => employee.overdueTasks > 0 || employee.workloadLevel === 'High').slice(0, 8).map((employee) => (
              <div key={employee._id} className="rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-900">
                <div className="flex justify-between gap-3"><b>{employee.name}</b><span>{employee.performanceScore}%</span></div>
                <p className="mt-1 text-slate-500">{employee.workloadLevel} workload, {employee.overdueTasks} overdue, {employee.pendingApprovals} approvals</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
