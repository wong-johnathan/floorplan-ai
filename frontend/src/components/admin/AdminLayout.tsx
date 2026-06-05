import { Link, Outlet, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/bto', label: 'BTO Projects', end: false },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4 flex flex-col">
        <div className="mb-8">
          <Link to="/admin" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Floorplan AI
          </Link>
          <p className="text-xs text-zinc-500 mt-1">Admin Panel</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <a href="/api/auth/logout" className="text-sm text-zinc-500 hover:text-zinc-700">
            Sign out
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
