import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../LoginPage';

function wrap(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/login${search}`]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  it('renders the Sign in with Google link', () => {
    wrap();
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('does not show an error message by default', () => {
    wrap();
    expect(screen.queryByText('Sign-in failed. Please try again.')).toBeNull();
  });

  it('shows error message when ?error=oauth_failed is present', () => {
    wrap('?error=oauth_failed');
    expect(screen.getByText('Sign-in failed. Please try again.')).toBeInTheDocument();
  });
});
