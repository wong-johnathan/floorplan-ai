import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listAllBTOProjects } from '../../lib/api';

export function AdminDashboard() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['admin', 'bto', 'all'],
    queryFn: listAllBTOProjects,
  });

  const publishedCount = projects?.filter((p) => p.published).length ?? 0;
  const draftCount = projects?.filter((p) => !p.published).length ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-500">Total Projects</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{isLoading ? '...' : projects?.length ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-500">Published</p>
          <p className="text-2xl font-bold text-green-600">{isLoading ? '...' : publishedCount}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <p className="text-sm text-zinc-500">Drafts</p>
          <p className="text-2xl font-bold text-amber-600">{isLoading ? '...' : draftCount}</p>
        </div>
      </div>

      {/* Recent projects */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent BTO Projects</h2>
          <Link
            to="/admin/bto/new"
            className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-md text-sm font-medium"
          >
            Add BTO Project
          </Link>
        </div>
        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : projects && projects.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left py-2 text-zinc-500 font-medium">Name</th>
                <th className="text-left py-2 text-zinc-500 font-medium">Location</th>
                <th className="text-left py-2 text-zinc-500 font-medium">Year</th>
                <th className="text-left py-2 text-zinc-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, 10).map((p) => (
                <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-2">
                    <Link to={`/admin/bto/${p.id}`} className="text-zinc-900 dark:text-zinc-50 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">{p.location}</td>
                  <td className="py-2 text-zinc-600 dark:text-zinc-400">{p.launchYear}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.published
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-zinc-500">
            No BTO projects yet.{' '}
            <Link to="/admin/bto/new" className="underline">Create your first one.</Link>
          </p>
        )}
      </div>
    </div>
  );
}
