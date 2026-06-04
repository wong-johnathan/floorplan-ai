import { useSearchParams } from 'react-router-dom';

export function LoginPage() {
  const [params] = useSearchParams();
  const hasOAuthError = params.get('error') === 'oauth_failed';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Floorplan AI</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">Design your dream HDB flat</p>
        {hasOAuthError && (
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">
            Sign-in failed. Please try again.
          </p>
        )}
        <a
          href="/api/auth/google"
          className="flex items-center justify-center w-full px-4 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-700 font-medium hover:bg-zinc-50 transition-colors"
        >
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
