import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import * as AuthCtx from '../../context/AuthContext';

function wrap(overrides: Partial<ReturnType<typeof AuthCtx.useAuth>>) {
  vi.spyOn(AuthCtx, 'useAuth').mockReturnValue({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    ...overrides,
  });
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>secret content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => vi.restoreAllMocks());

describe('ProtectedRoute', () => {
  it('renders a spinner while loading', () => {
    wrap({ isLoading: true });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    wrap({ isLoading: false, isAuthenticated: false });
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).toBeNull();
  });

  it('renders children when authenticated', () => {
    wrap({ isLoading: false, isAuthenticated: true, user: { userId: 'cuid_1', role: 'user' } });
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });
});
