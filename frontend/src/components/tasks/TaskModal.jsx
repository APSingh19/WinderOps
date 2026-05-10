import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';

export function TaskModal({ project, projects = [], task, onClose, onSaved }) {
  const projectOptions = projects.length ? projects : [project].filter(Boolean);
  const [form, setForm] = useState({
    project: task?.project?._id || task?.project || project?._id || '',
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'Todo',
    approvalStatus: task?.approvalStatus || 'Not Required',
    reviewStatus: task?.reviewStatus || 'Not Started',
    reviewer: task?.reviewer?._id || '',
    assignee: task?.assignee?._id || '',
    dueDate: task?.dueDate?.slice(0, 10) || ''
  });
  const [saving, setSaving] = useState(false);
  const selectedProject = projectOptions.find((item) => item._id === form.project) || project;
  const projectMembers = selectedProject?.members || [];

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        project: form.project || project?._id,
        assignee: form.assignee || null,
        reviewer: form.reviewer || undefined,
        dueDate: form.dueDate || undefined,
        description: form.description || undefined
      };
      const request = task ? api.patch(`/tasks/${task._id}`, payload) : api.post('/tasks', payload);
      const { data } = await request;
      toast.success(task ? 'Task updated' : 'Task created');
      onSaved(data);
    } finally {
      setSaving(false);
    }
  };

  const review = async (decision) => {
    setSaving(true);
    const { data } = await api.patch(`/tasks/${task._id}/review`, { decision });
    toast.success(decision === 'approve' ? 'Task approved' : 'Changes requested');
    onSaved(data);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-3 sm:p-4">
      <form onSubmit={submit} className="panel flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-lg font-bold">{task ? 'Edit task' : 'New task'}</h2>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="scrollbar grid gap-4 overflow-y-auto p-4 sm:grid-cols-2">
          {!task ? (
            <label className="sm:col-span-2">
              <span className="mb-1 block text-sm font-medium">Project</span>
              <select className="input" value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value, assignee: '', reviewer: '' })} required>
                <option value="">Choose project</option>
                {projectOptions.map((item) => (
                  <option key={item._id} value={item._id}>{item.key} - {item.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Title</span>
            <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">Description</span>
            <textarea className="input min-h-24" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Priority</span>
            <select className="input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Status</span>
            <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option>Todo</option>
              <option>In Progress</option>
              <option>Review</option>
              <option>Completed</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Assignee</span>
            <select className="input" value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.target.value })}>
              <option value="">Unassigned</option>
              {projectMembers.map((member) => (
                <option key={member.user._id} value={member.user._id}>{member.user.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Reviewer</span>
            <select className="input" value={form.reviewer} onChange={(event) => setForm({ ...form, reviewer: event.target.value })}>
              <option value="">Project default</option>
              {projectMembers.map((member) => (
                <option key={member.user._id} value={member.user._id}>{member.user.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Approval</span>
            <select className="input" value={form.approvalStatus} onChange={(event) => setForm({ ...form, approvalStatus: event.target.value })}>
              <option>Not Required</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium">Due date</span>
            <input type="date" className="input" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
          </label>
        </div>
        <div className="shrink-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          {task && task.approvalStatus === 'Pending' ? (
            <>
              <button type="button" className="btn-ghost" onClick={() => review('reject')} disabled={saving}><XCircle size={16} /> Request changes</button>
              <button type="button" className="btn-primary" onClick={() => review('approve')} disabled={saving}><CheckCircle2 size={16} /> Approve</button>
            </>
          ) : null}
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save task'}</button>
        </div>
      </form>
    </div>
  );
}
