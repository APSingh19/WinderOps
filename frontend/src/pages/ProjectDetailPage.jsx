import { CalendarDays, KanbanSquare, Plus, Save, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { joinProjectRoom } from '../api/socket.js';
import { KanbanBoard } from '../components/tasks/KanbanBoard.jsx';
import { TaskModal } from '../components/tasks/TaskModal.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [taskModal, setTaskModal] = useState(null);
  const [memberId, setMemberId] = useState('');

  const load = async () => {
    const [projectResponse, taskResponse, userResponse, departmentResponse, teamResponse] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get('/tasks', { params: { project: id, limit: 100 } }),
      api.get('/users'),
      api.get('/organization/departments'),
      api.get('/organization/teams')
    ]);
    setProject(projectResponse.data);
    setTasks(taskResponse.data.items);
    setUsers(userResponse.data.items);
    setDepartments(departmentResponse.data.items);
    setTeams(teamResponse.data.items);
    joinProjectRoom(id);
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateProject = async () => {
    const payload = {
      ...project,
      department: project.department?._id || project.department || undefined,
      assignedTeam: project.assignedTeam?._id || project.assignedTeam || undefined,
      projectManager: project.projectManager?._id || project.projectManager || undefined,
      members: project.members?.map((member) => ({
        user: member.user?._id || member.user,
        role: member.role,
        team: member.team
      }))
    };
    const { data } = await api.patch(`/projects/${id}`, payload);
    setProject(data);
    toast.success('Project updated');
  };

  const addMember = async () => {
    if (!memberId) return;
    const { data } = await api.post(`/projects/${id}/members`, { userId: memberId, role: 'Member' });
    setProject(data);
    setMemberId('');
    toast.success('Member added');
  };

  const removeMember = async (user) => {
    const { data } = await api.delete(`/projects/${id}/members/${user._id}`);
    setProject(data);
    toast.success(`${user.name} removed`);
  };

  const onSaved = (task) => {
    setTasks((items) => {
      const exists = items.some((item) => item._id === task._id);
      return exists ? items.map((item) => (item._id === task._id ? task : item)) : [task, ...items];
    });
    setTaskModal(null);
  };

  if (!project) return <Skeleton className="h-[40rem]" />;

  const completion = tasks.length ? Math.round((tasks.filter((task) => task.status === 'Completed').length / tasks.length) * 100) : 0;
  const memberIds = new Set((project.members || []).map((member) => member.user._id));
  const availableUsers = users.filter((user) => !memberIds.has(user._id));

  return (
    <div className="space-y-6">
      <section className="panel rounded-lg p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <span className="badge text-white" style={{ background: project.color }}>{project.key}</span>
            <input className="mt-3 block w-full bg-transparent text-3xl font-black outline-none" value={project.name} onChange={(event) => setProject({ ...project, name: event.target.value })} />
            <textarea className="mt-2 min-h-16 w-full resize-none bg-transparent text-sm text-slate-500 outline-none" value={project.description || ''} onChange={(event) => setProject({ ...project, description: event.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={updateProject}><Save size={16} /> Save</button>
            <button className="btn-primary" onClick={() => setTaskModal({})}><Plus size={16} /> Task</button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900"><KanbanSquare size={18} /><p className="mt-2 text-2xl font-black">{tasks.length}</p><p className="text-sm text-slate-500">Total tasks</p></div>
          <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900"><CalendarDays size={18} /><p className="mt-2 text-2xl font-black">{completion}%</p><p className="text-sm text-slate-500">Complete</p></div>
          <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900"><Users size={18} /><p className="mt-2 text-2xl font-black">{project.members?.length || 0}</p><p className="text-sm text-slate-500">Members</p></div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <select className="input" value={project.department?._id || project.department || ''} onChange={(event) => setProject({ ...project, department: event.target.value || null })}>
            <option value="">Department ownership</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{department.departmentName || department.name}</option>)}
          </select>
          <select className="input" value={project.assignedTeam?._id || project.assignedTeam || ''} onChange={(event) => setProject({ ...project, assignedTeam: event.target.value || null })}>
            <option value="">Assigned team</option>
            {teams.map((team) => <option key={team._id} value={team._id}>{team.teamName || team.name}</option>)}
          </select>
          <select className="input" value={project.projectManager?._id || project.projectManager || ''} onChange={(event) => setProject({ ...project, projectManager: event.target.value || null })}>
            <option value="">Project manager</option>
            {users.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.role}</option>)}
          </select>
        </div>
      </section>

      <section className="panel rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select className="input" value={memberId} onChange={(event) => setMemberId(event.target.value)}>
            <option value="">Select a teammate to add</option>
            {availableUsers.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.email}</option>)}
          </select>
          <button className="btn-ghost" onClick={addMember}><Users size={16} /> Add member</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.members?.map((member) => (
            <span key={member.user._id} className="badge gap-2 bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {member.user.name} - {member.role}
              {member.user._id !== project.owner?._id ? (
                <button className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => removeMember(member.user)} aria-label={`Remove ${member.user.name}`}>
                  <Trash2 size={12} />
                </button>
              ) : null}
            </span>
          ))}
        </div>
      </section>

      <KanbanBoard tasks={tasks} setTasks={setTasks} onEdit={(task) => setTaskModal(task)} />
      {taskModal ? <TaskModal project={project} task={taskModal._id ? taskModal : null} onClose={() => setTaskModal(null)} onSaved={onSaved} /> : null}
    </div>
  );
}
