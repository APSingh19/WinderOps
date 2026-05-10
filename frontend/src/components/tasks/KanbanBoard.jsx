import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Calendar, MessageSquare, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../../api/client.js';

const columns = ['Todo', 'In Progress', 'Review', 'Completed'];
const priorityStyles = {
  Low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  High: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200'
};

const approvalStyles = {
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  Rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200'
};

export function KanbanBoard({ tasks, setTasks, onEdit }) {
  const grouped = columns.reduce((acc, column) => {
    acc[column] = tasks.filter((task) => task.status === column).sort((a, b) => a.position - b.position);
    return acc;
  }, {});

  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination) return;
    const next = tasks.map((task) =>
      task._id === draggableId ? { ...task, status: destination.droppableId, position: destination.index } : task
    );
    setTasks(next);
    await api.patch('/tasks/reorder', {
      updates: next.map((task, index) => ({ id: task._id, status: task.status, position: index }))
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => (
          <Droppable key={column} droppableId={column}>
            {(provided, snapshot) => (
              <section
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[34rem] rounded-lg border border-slate-200 bg-slate-100/70 p-3 dark:border-slate-800 dark:bg-slate-900/60 ${snapshot.isDraggingOver ? 'ring-2 ring-blue-200' : ''}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold">{column}</h3>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-950">{grouped[column].length}</span>
                </div>
                <div className="space-y-3">
                  {grouped[column].map((task, index) => (
                    <Draggable key={task._id} draggableId={task._id} index={index}>
                      {(dragProvided) => (
                        <article
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          onClick={() => onEdit(task)}
                          className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <h4 className="text-sm font-semibold leading-5">{task.title}</h4>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className={`badge ${priorityStyles[task.priority]}`}>{task.priority}</span>
                              {task.approvalStatus && task.approvalStatus !== 'Not Required' ? (
                                <span className={`badge ${approvalStyles[task.approvalStatus] || approvalStyles.Pending}`}>{task.approvalStatus}</span>
                              ) : null}
                            </div>
                          </div>
                          <p className="line-clamp-2 text-sm text-slate-500">{task.description || 'No description'}</p>
                          <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                              {task.assignee ? <span className="grid h-7 w-7 place-items-center rounded-full bg-jade font-bold text-white">{task.assignee.name[0]}</span> : <span>Unassigned</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              {task.dueDate ? <span className="inline-flex items-center gap-1"><Calendar size={14} /> {format(new Date(task.dueDate), 'MMM d')}</span> : null}
                              <span className="inline-flex items-center gap-1"><MessageSquare size={14} /> {task.comments?.length || 0}</span>
                              <span className="inline-flex items-center gap-1"><Paperclip size={14} /> {task.attachments?.length || 0}</span>
                            </div>
                          </div>
                        </article>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </section>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
