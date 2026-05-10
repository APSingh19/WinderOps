import { CheckCheck } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../api/client.js';
import { fetchNotifications } from '../store/notificationSlice.js';

export function NotificationsPage() {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.notifications.items);

  const markAllRead = async () => {
    await api.patch('/notifications/read', { ids: notifications.map((item) => item._id) });
    dispatch(fetchNotifications());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Notifications</h1>
          <p className="text-sm text-slate-500">Assignments, comments, status changes, and due-date alerts.</p>
        </div>
        <button className="btn-ghost" onClick={markAllRead}><CheckCheck size={16} /> Mark read</button>
      </div>
      <section className="panel divide-y divide-slate-200 rounded-lg dark:divide-slate-800">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No notifications yet.</div>
        ) : notifications.map((notification) => (
          <article key={notification._id} className="flex items-start gap-3 p-4">
            <span className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.read ? 'bg-slate-300' : 'bg-coral'}`} />
            <div>
              <p className="font-semibold">{notification.message}</p>
              <p className="mt-1 text-sm text-slate-500">{notification.type.replaceAll('_', ' ')}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
