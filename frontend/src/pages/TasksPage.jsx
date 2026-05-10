import { CalendarDays, CheckCheck, Columns3, ListTodo, Plus, Search, Table2 } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { KanbanBoard } from '../components/tasks/KanbanBoard.jsx';
import { TaskModal } from '../components/tasks/TaskModal.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { getName } from '../utils/enterprise.js';

const statuses = ['', 'Todo', 'In Progress', 'Review', 'Completed'];
const priorities = ['', 'Low', 'Medium', 'High'];

export function TasksPage() {
  const [tasks, setTasks] = useState(null);
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [view, setView] = useState('kanban');
  const [taskModal, setTaskModal] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', department: '', team: '', approvalStatus: '' });
  const [savedFilters, setSavedFilters] = useState([]);

  const load = async () => {
    const [taskResponse, projectResponse, departmentResponse, teamResponse] = await Promise.all([
      api.get('/tasks', { params: { ...filters, limit: 200 } }),
      api.get('/projects', { params: { limit: 100 } }),
      api.get('/organization/departments'),
      api.get('/organization/teams')
    ]);
    setTasks(taskResponse.data.items);
    setProjects(projectResponse.data.items);
    setDepartments(departmentResponse.data.items);
    setTeams(teamResponse.data.items);
    api.get('/saved-filters').then((response) => setSavedFilters(response.data.items));
  };

  useEffect(() => {
    load();
  }, [filters.status, filters.priority, filters.department, filters.team, filters.approvalStatus]);

  const metrics = useMemo(() => {
    const items = tasks || [];
    return {
      total: items.length,
      approvals: items.filter((task) => task.approvalStatus === 'Pending').length,
      completed: items.filter((task) => task.status === 'Completed').length,
      overdue: items.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed').length
    };
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() + index);
      return day;
    });
  }, []);

  const onSaved = (task) => {
    setTasks((items) => {
      const exists = items.some((item) => item._id === task._id);
      return exists ? items.map((item) => (item._id === task._id ? task : item)) : [task, ...items];
    });
    setTaskModal(null);
  };

  const applyPreset = (preset) => {
    const presets = {
      'My Department': { ...filters, department: departments[0]?._id || '' },
      'Pending Approvals': { ...filters, approvalStatus: 'Pending' },
      'Overdue by Team': { ...filters, team: teams[0]?._id || '', status: '' }
    };
    setFilters(presets[preset]);
  };

  const saveCurrentFilter = async () => {
    const name = window.prompt('Filter name');
    if (!name) return;
    const { data } = await api.post('/saved-filters', { name, query: filters });
    setSavedFilters([data, ...savedFilters]);
  };

  if (!tasks) {
    return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-36" />)}</div>;
  }

  const taskProject = taskModal?._id
    ? projects.find((project) => project._id === (taskModal.project?._id || taskModal.project)) || projects[0]
    : projects.find((project) => project._id === taskModal?.project) || projects[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-black">Tasks</h1>
          <p className="text-sm text-slate-500">Enterprise task queue with Kanban, list, calendar, priority, and approval views.</p>
        </div>
        <button className="btn-primary" onClick={() => taskProject && setTaskModal({ project: taskProject._id })} disabled={!taskProject}>
          <Plus size={16} /> New task
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total tasks', value: metrics.total, icon: ListTodo, tone: 'bg-marine' },
          { label: 'Pending approvals', value: metrics.approvals, icon: CheckCheck, tone: 'bg-coral' },
          { label: 'Completed', value: metrics.completed, icon: Columns3, tone: 'bg-jade' },
          { label: 'Overdue', value: metrics.overdue, icon: CalendarDays, tone: 'bg-berry' }
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

      <section className="panel rounded-lg p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {['My Department', 'Pending Approvals', 'Overdue by Team'].map((preset) => (
            <button key={preset} className="btn-ghost" onClick={() => applyPreset(preset)}>{preset}</button>
          ))}
          {savedFilters.map((item) => (
            <button key={item._id} className="btn-ghost" onClick={() => setFilters({ ...filters, ...item.query })}>{item.name}</button>
          ))}
          <button className="btn-primary" onClick={saveCurrentFilter}>Save filter</button>
        </div>
        <div className="grid gap-3 xl:grid-cols-[1fr_repeat(5,12rem)_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input className="input pl-10" placeholder="Search tasks" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && load()} />
          </label>
          <select className="input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>{statuses.map((status) => <option key={status} value={status}>{status || 'All statuses'}</option>)}</select>
          <select className="input" value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>{priorities.map((priority) => <option key={priority} value={priority}>{priority || 'All priorities'}</option>)}</select>
          <select className="input" value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })}>
            <option value="">All departments</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{getName(department)}</option>)}
          </select>
          <select className="input" value={filters.team} onChange={(event) => setFilters({ ...filters, team: event.target.value })}>
            <option value="">All teams</option>
            {teams.map((team) => <option key={team._id} value={team._id}>{getName(team)}</option>)}
          </select>
          <select className="input" value={filters.approvalStatus} onChange={(event) => setFilters({ ...filters, approvalStatus: event.target.value })}>
            <option value="">All approvals</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
            <option>Not Required</option>
          </select>
          <button className="btn-ghost" onClick={load}>Apply</button>
        </div>
      </section>

      <section className="panel rounded-lg p-2">
        <div className="grid gap-2 sm:grid-cols-3">
          {[{ key: 'kanban', label: 'Kanban', icon: Columns3 }, { key: 'list', label: 'List', icon: Table2 }, { key: 'calendar', label: 'Calendar', icon: CalendarDays }].map(({ key, label, icon: Icon }) => (
            <button key={key} className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${view === key ? 'bg-marine text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'}`} onClick={() => setView(key)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </section>

      {view === 'kanban' ? <KanbanBoard tasks={tasks} setTasks={setTasks} onEdit={(task) => setTaskModal(task)} /> : null}

      {view === 'list' ? (
        <section className="panel overflow-hidden rounded-lg">
          <div className="grid grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase text-slate-500 dark:border-slate-800">
            <span>Task</span><span>Project</span><span>Assignee</span><span>Priority</span><span>Approval</span>
          </div>
          {tasks.map((task) => (
            <button key={task._id} className="grid w-full grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm transition hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900" onClick={() => setTaskModal(task)}>
              <span className="font-semibold">{task.title}</span>
              <span className="text-slate-500">{task.project?.name || 'Project'}</span>
              <span className="text-slate-500">{task.assignee?.name || 'Unassigned'}</span>
              <span>{task.priority}</span>
              <span>{task.approvalStatus}</span>
            </button>
          ))}
        </section>
      ) : null}

      {view === 'calendar' ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {calendarDays.map((day) => {
            const dueTasks = tasks.filter((task) => task.dueDate && isSameDay(new Date(task.dueDate), day));
            return (
              <article key={day.toISOString()} className="panel min-h-40 rounded-lg p-3">
                <h3 className="text-sm font-black">{format(day, 'EEE, MMM d')}</h3>
                <div className="mt-3 space-y-2">
                  {dueTasks.map((task) => <button key={task._id} className="w-full rounded-md bg-blue-50 px-2 py-1 text-left text-xs font-semibold text-marine dark:bg-blue-950 dark:text-blue-200" onClick={() => setTaskModal(task)}>{task.title}</button>)}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {taskModal && taskProject ? <TaskModal project={taskProject} projects={projects} task={taskModal._id ? taskModal : null} onClose={() => setTaskModal(null)} onSaved={onSaved} /> : null}
    </div>
  );
}
