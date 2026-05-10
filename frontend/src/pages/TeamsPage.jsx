import { Search, Trash2, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { getSocket } from '../api/socket.js';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { canManageOrg, getName } from '../utils/enterprise.js';

export function TeamsPage() {
  const [teams, setTeams] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', department: '' });
  const [pendingArchive, setPendingArchive] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const currentUser = useSelector((state) => state.auth.user);
  const canDeleteTeams = canManageOrg(currentUser?.role) || currentUser?.role === 'Team Leader';

  const load = () => {
    Promise.all([
      api.get('/organization/teams', { params: { page: pagination.page, limit: 24, search: filters.search } }),
      api.get('/organization/departments'),
      api.get('/analytics/teams/performance')
    ]).then(([teamResponse, departmentResponse, performanceResponse]) => {
      setTeams(teamResponse.data.items);
      setPagination({ page: teamResponse.data.page || 1, pages: teamResponse.data.pages || 1, total: teamResponse.data.total || teamResponse.data.items.length });
      setDepartments(departmentResponse.data.items);
      setPerformance(performanceResponse.data.items);
    });
  };

  useEffect(() => {
    load();
    const socket = getSocket();
    socket?.on('organization:team-deleted', load);
    socket?.on('organization:team-updated', load);
    return () => {
      socket?.off('organization:team-deleted', load);
      socket?.off('organization:team-updated', load);
    };
  }, [pagination.page, filters.search]);

  const removeTeam = async () => {
    await api.delete(`/organization/teams/${pendingArchive._id}`);
    toast.success(`${getName(pendingArchive)} archived`);
    setPendingArchive(null);
    load();
  };

  const filtered = useMemo(() => {
    if (!teams) return [];
    return teams.filter((team) => {
      const matchesSearch = getName(team).toLowerCase().includes(filters.search.toLowerCase()) || team.lead?.name?.toLowerCase().includes(filters.search.toLowerCase());
      const matchesDepartment = !filters.department || (team.department?._id || team.department) === filters.department;
      return matchesSearch && matchesDepartment;
    });
  }, [teams, filters]);

  if (!teams) {
    return <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-44" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Teams</h1>
        <p className="text-sm text-slate-500">Team leaders, employees, department ownership, and project assignments.</p>
      </div>

      <section className="panel rounded-lg p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input className="input pl-10" placeholder="Search teams or leaders" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} onKeyDown={(event) => event.key === 'Enter' && setPagination((value) => ({ ...value, page: 1 }))} />
          </label>
          <select className="input" value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })}>
            <option value="">All departments</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{getName(department)}</option>)}
          </select>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((team) => (
          <article key={team._id} className="panel rounded-lg p-5 transition hover:bg-slate-50 dark:hover:bg-slate-900">
            {(() => {
              const score = performance.find((item) => item._id === team._id);
              return (
                <>
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-marine text-white"><UsersRound size={20} /></span>
              <div className="min-w-0">
                <Link to={`/teams/${team._id}`} className="truncate text-lg font-black hover:text-marine">{getName(team)}</Link>
                <p className="text-sm text-slate-500">Lead: {team.teamLead?.name || team.lead?.name || 'Unassigned'}</p>
              </div>
              {canDeleteTeams ? (
                <button className="btn-ghost ml-auto px-2" onClick={() => setPendingArchive(team)} aria-label={`Archive ${getName(team)}`}>
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
              <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{team.members?.length || 0}</b><br />Members</span>
              <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{score?.projects ?? 0}</b><br />Projects</span>
              <span className="rounded-md bg-slate-100 p-3 dark:bg-slate-900"><b>{score?.tasks ?? 0}</b><br />Tasks</span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm"><span>Performance</span><b>{score?.performanceScore ?? 0}%</b></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-marine" style={{ width: `${score?.performanceScore ?? 0}%` }} /></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(team.members || []).slice(0, 5).map((member) => <span key={member._id} className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{member.name}</span>)}
            </div>
                </>
              );
            })()}
          </article>
        ))}
      </section>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{pagination.total} teams</p>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={pagination.page <= 1} onClick={() => setPagination((value) => ({ ...value, page: value.page - 1 }))}>Previous</button>
          <button className="btn-ghost" disabled={pagination.page >= pagination.pages} onClick={() => setPagination((value) => ({ ...value, page: value.page + 1 }))}>Next</button>
        </div>
      </div>
      {pendingArchive ? (
        <ConfirmDialog
          title={`Archive ${getName(pendingArchive)}?`}
          message="The team will be hidden from active management views, detached from projects, and preserved in audit history."
          confirmLabel="Archive team"
          onCancel={() => setPendingArchive(null)}
          onConfirm={removeTeam}
        />
      ) : null}
    </div>
  );
}
