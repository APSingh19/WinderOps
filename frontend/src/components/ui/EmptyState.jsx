import { FolderOpen } from 'lucide-react';

export function EmptyState({ title, message }) {
  return (
    <div className="panel grid min-h-56 place-items-center rounded-lg p-8 text-center">
      <div>
        <FolderOpen className="mx-auto mb-3 text-slate-400" size={36} />
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}
