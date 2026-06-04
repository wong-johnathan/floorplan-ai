import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface User {
  userId: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
});

async function fetchMe(): Promise<User> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) throw new Error('unauthenticated');
  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
  });

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
