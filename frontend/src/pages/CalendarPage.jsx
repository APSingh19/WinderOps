import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

export function CalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [month] = useState(new Date());

  useEffect(() => {
    api.get('/tasks', { params: { limit: 200 } }).then((response) => setTasks(response.data.items));
  }, []);

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Calendar</h1>
        <p className="text-sm text-slate-500">Tasks grouped by due date for the current month.</p>
      </div>
      <section className="panel overflow-hidden rounded-lg">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="font-bold">{format(month, 'MMMM yyyy')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7">
          {days.map((day) => {
            const dueTasks = tasks.filter((task) => task.dueDate && isSameDay(new Date(task.dueDate), day));
            return (
              <div key={day.toISOString()} className="min-h-36 border-b border-r border-slate-200 p-3 dark:border-slate-800">
                <div className="mb-3 text-sm font-bold">{format(day, 'd')}</div>
                <div className="space-y-2">
                  {dueTasks.map((task) => (
                    <div key={task._id} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-marine dark:bg-blue-950 dark:text-blue-200">
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
