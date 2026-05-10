import { CheckCircle2 } from 'lucide-react';

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen bg-mist text-slate-900 dark:bg-slate-950 dark:text-slate-100 lg:grid-cols-[1fr_30rem]">
      <section className="hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-white text-sm font-black text-ink">WO</div>
          <span className="text-xl font-black">WinderOps</span>
        </div>
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-blue-200">Modern project operations</p>
          <h1 className="text-5xl font-black leading-tight">Ship thoughtful work with a board your whole team can trust.</h1>
          <div className="mt-8 grid gap-3 text-sm text-slate-200">
            {['Role-based workspaces', 'Live notifications', 'Analytics, calendar, profiles', 'Secure Express and MongoDB backend'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-300" /> {item}</span>
            ))}
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center p-5">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-md bg-ink text-sm font-black text-white dark:bg-white dark:text-ink">WO</div>
            <p className="text-xl font-black">WinderOps</p>
          </div>
          <h2 className="text-3xl font-black">{title}</h2>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  );
}
