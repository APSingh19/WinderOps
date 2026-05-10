import { Activity, Clock, FolderKanban, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../api/client.js';
import { Skeleton } from '../components/ui/Skeleton.jsx';

export function ActivityPage() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/activity', { params: { limit: 60 } }).then((response) => setItems(response.data.items));
  }, []);

  if (!items) return <div className="grid gap-3">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-20" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Activity</h1>
        <p className="text-sm text-slate-500">Audit trail for project, task, and organization changes.</p>
      </div>

      <section className="panel rounded-lg">
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No activity has been recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((item) => (
              <article key={item._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-200">
                    <Activity size={18} />
                  </span>
                  <div>
                    <h2 className="font-bold">{item.action}</h2>
                    <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span><UserRound className="mr-1 inline" size={14} /> {item.actor?.name || 'System'}</span>
                      {item.project ? <span><FolderKanban className="mr-1 inline" size={14} /> {item.project.name}</span> : null}
                      {item.task ? <span>{item.task.title}</span> : null}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-slate-500">
                  <Clock className="mr-1 inline" size={13} />
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
