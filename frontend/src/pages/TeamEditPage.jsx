import { ArrowLeft, Save, UserMinus, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { getName } from '../utils/enterprise.js';

export function TeamEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [memberId, setMemberId] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/organization/teams/${id}/structure`),
      api.get('/organization/departments'),
      api.get('/users', { params: { limit: 200 } })
    ]).then(([teamResponse, departmentResponse, userResponse]) => {
      setTeam(teamResponse.data);
      setDepartments(departmentResponse.data.items);
      setUsers(userResponse.data.items);
    });
  }, [id]);

  const memberIds = useMemo(() => new Set((team?.members || []).map((member) => member._id)), [team]);
  const availableUsers = users.filter((user) => !memberIds.has(user._id));

  const save = async () => {
    const payload = {
      name: team.name,
      teamName: team.teamName || team.name,
      department: team.department?._id || team.department || null,
      lead: team.lead?._id || team.teamLead?._id || team.lead || team.teamLead || null,
      teamLead: team.teamLead?._id || team.lead?._id || team.teamLead || team.lead || null,
      members: (team.members || []).map((member) => member._id || member)
    };
    await api.patch(`/organization/teams/${id}`, payload);
    toast.success('Team updated');
    navigate(`/teams/${id}`);
  };

  const addMember = () => {
    const user = users.find((item) => item._id === memberId);
    if (!user) return;
    setTeam({ ...team, members: [...(team.members || []), user] });
    setMemberId('');
  };

  const removeMember = (userId) => {
    setTeam({ ...team, members: (team.members || []).filter((member) => member._id !== userId) });
  };

  if (!team) return <Skeleton className="h-[36rem]" />;

  return (
    <div className="space-y-6">
      <Link to={`/teams/${id}`} className="btn-ghost"><ArrowLeft size={16} /> Team details</Link>
      <section className="panel rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-black">Edit Team</h1>
            <p className="text-sm text-slate-500">Rename team, change department, assign leader, and manage members.</p>
          </div>
          <button className="btn-primary" onClick={save}><Save size={16} /> Save team</button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <input className="input" value={team.name || ''} onChange={(event) => setTeam({ ...team, name: event.target.value, teamName: event.target.value })} placeholder="Team name" />
          <select className="input" value={team.department?._id || team.department || ''} onChange={(event) => setTeam({ ...team, department: event.target.value })}>
            <option value="">No department</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{getName(department)}</option>)}
          </select>
          <select className="input" value={team.teamLead?._id || team.lead?._id || ''} onChange={(event) => setTeam({ ...team, lead: event.target.value, teamLead: event.target.value })}>
            <option value="">No lead</option>
            {users.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.role}</option>)}
          </select>
        </div>
      </section>

      <section className="panel rounded-lg p-5">
        <h2 className="font-black">Members</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <select className="input" value={memberId} onChange={(event) => setMemberId(event.target.value)}>
            <option value="">Add employee</option>
            {availableUsers.map((user) => <option key={user._id} value={user._id}>{user.name} - {user.role}</option>)}
          </select>
          <button className="btn-ghost" onClick={addMember}><UserPlus size={16} /> Add member</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(team.members || []).map((member) => (
            <div key={member._id} className="flex items-center justify-between gap-3 rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-900">
              <span><b>{member.name}</b><br /><span className="text-slate-500">{member.role}</span></span>
              <button className="btn-ghost px-2" onClick={() => removeMember(member._id)} aria-label={`Remove ${member.name}`}>
                <UserMinus size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
