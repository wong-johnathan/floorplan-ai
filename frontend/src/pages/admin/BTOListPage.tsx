import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listAllBTOProjects } from '../../lib/api';

export function BTOListPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ['admin', 'bto', 'all'],
    queryFn: listAllBTOProjects,
  });
  const [search, setSearch] = useState('');

  const filtered = projects?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.location.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">BTO Projects</h1>
        <Link
          to="/admin/bto/new"
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-md text-sm font-medium"
        >
          New BTO Project
        </Link>
      </div>

      <input
        type="text"
        placeholder="Search by name or location..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 mb-4 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm"
      />

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">Name</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">Location</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">Year</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">Models</th>
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <td className="py-3 px-4">
                    <Link to={`/admin/bto/${p.id}`} className="text-zinc-900 dark:text-zinc-50 font-medium hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{p.location}</td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{p.launchYear}</td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{p._count?.flatTypes ?? 0}</td>
                  <td className="py-3 px-4">
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    {projects?.length === 0 ? (
                      <>No BTO projects yet. <Link to="/admin/bto/new" className="underline">Create one.</Link></>
                    ) : (
                      'No projects match your search.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
