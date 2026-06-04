import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../AuthContext';

function TestConsumer() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>loading</div>;
  return <div>{isAuthenticated ? `hello ${user!.userId}` : 'not logged in'}</div>;
}

function wrap() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </QueryClientProvider>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('AuthContext', () => {
  it('exposes user and isAuthenticated=true when /api/auth/me returns 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ userId: 'cuid_1', role: 'user' }),
    }));
    wrap();
    await waitFor(() => expect(screen.getByText('hello cuid_1')).toBeInTheDocument());
  });

  it('exposes isAuthenticated=false when /api/auth/me returns 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    wrap();
    await waitFor(() => expect(screen.getByText('not logged in')).toBeInTheDocument());
  });
});
