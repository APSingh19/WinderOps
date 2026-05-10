import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export function AuditLogPage() {
  const [activity, setActivity] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/activity', { params: { page, limit: 30 } }).then((response) => setActivity(response.data));
  }, [page]);

  if (!activity) return <Skeleton className="h-[32rem]" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Audit Log</h1>
        <p className="text-sm text-slate-500">Compliance trail for organization, project, task, and people-management activity.</p>
      </div>
      <section className="panel divide-y divide-slate-200 rounded-lg dark:divide-slate-800">
        {activity.items.map((item) => (
          <article key={item._id} className="flex items-start gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-950"><ShieldCheck size={18} /></span>
            <div className="min-w-0">
              <p className="font-semibold">{item.action}</p>
              <p className="mt-1 text-sm text-slate-500">
                {item.entityType} {item.actor?.name ? `by ${item.actor.name}` : ''} on {new Date(item.createdAt).toLocaleString()}
              </p>
              {item.project?.name ? <p className="mt-1 text-sm text-slate-500">Project: {item.project.name}</p> : null}
            </div>
          </article>
        ))}
      </section>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{activity.total} audit events</p>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
          <button className="btn-ghost" disabled={page >= activity.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
