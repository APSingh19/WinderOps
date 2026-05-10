import {
  Activity,
  ClipboardCheck,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  Network,
  Settings,
  Sun,
  Users,
  UsersRound
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { connectSocket, getSocket } from '../../api/socket.js';
import { api } from '../../api/client.js';
import { logout } from '../../store/authSlice.js';
import { fetchNotifications, pushNotification } from '../../store/notificationSlice.js';
import { toggleTheme } from '../../store/themeSlice.js';

const links = [
  {
    title: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/projects', label: 'Projects', icon: FolderKanban },
      { to: '/tasks', label: 'Tasks', icon: ListTodo },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays }
    ]
  },
  {
    title: 'Organization',
    items: [
      { to: '/departments', label: 'Departments', icon: Building2 },
      { to: '/teams', label: 'Teams', icon: UsersRound },
      { to: '/employees', label: 'Employees', icon: Users },
      { to: '/organization', label: 'Org Structure', icon: Network }
    ]
  },
  {
    title: 'Operations',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/activity', label: 'Activity', icon: Activity },
      { to: '/audit', label: 'Audit Log', icon: ClipboardCheck },
      { to: '/settings', label: 'Settings', icon: Settings }
    ]
  }
];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [showShortcuts, setShowShortcuts] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const unread = useSelector((state) => state.notifications.items.filter((item) => !item.read).length);

  useEffect(() => {
    dispatch(fetchNotifications());
    api.get('/organization/departments').then((response) => setDepartments(response.data.items.slice(0, 5))).catch(() => setDepartments([]));
    const socket = connectSocket(user?._id);
    socket?.on('notification:new', (notification) => {
      dispatch(pushNotification(notification));
      toast(notification.message);
    });
    socket?.on('organization:department-updated', () => {
      api.get('/organization/departments').then((response) => setDepartments(response.data.items.slice(0, 5))).catch(() => setDepartments([]));
    });
    return () => getSocket()?.off('notification:new');
  }, [dispatch, user?._id]);

  const signOut = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-mist text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition dark:border-slate-800 dark:bg-slate-950 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-sm font-black text-white dark:bg-white dark:text-ink">WO</div>
          <div>
            <p className="font-bold">WinderOps</p>
            <p className="text-xs text-slate-500">Enterprise work OS</p>
          </div>
        </div>
        <nav className="h-[calc(100vh-12.5rem)] space-y-5 overflow-y-auto px-3 pb-5 scrollbar">
          {links.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[0.7rem] font-black uppercase tracking-wide text-slate-400">{section.title}</p>
              <div className="space-y-1">
                {section.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-blue-50 text-marine dark:bg-blue-950/50 dark:text-blue-200'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    {label === 'Notifications' && unread > 0 ? <span className="ml-auto rounded-full bg-coral px-2 py-0.5 text-xs text-white">{unread}</span> : null}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          {departments.length > 0 ? (
            <div>
              <button className="flex w-full items-center justify-between px-3 pb-2 text-[0.7rem] font-black uppercase tracking-wide text-slate-400" onClick={() => setShowShortcuts((value) => !value)}>
                Department Shortcuts <ChevronDown size={13} className={showShortcuts ? '' : '-rotate-90'} />
              </button>
              {showShortcuts ? (
                <div className="space-y-1">
                  {departments.map((department) => (
                    <NavLink key={department._id} to={`/departments/${department._id}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900">
                      <span className="h-2.5 w-2.5 rounded-full bg-jade" />
                      <span className="truncate">{department.departmentName || department.name}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-jade text-sm font-bold text-white">{user?.name?.[0] || 'U'}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
          </div>
          <button className="btn-ghost w-full" onClick={signOut}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
          <button className="btn-ghost lg:hidden" onClick={() => setOpen((value) => !value)} aria-label="Open navigation">
            <Menu size={18} />
          </button>
          <div className="hidden text-sm text-slate-500 sm:block">Plan, ship, and learn in one workspace.</div>
          <button className="btn-ghost" onClick={() => dispatch(toggleTheme())} aria-label="Toggle theme">
            {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
