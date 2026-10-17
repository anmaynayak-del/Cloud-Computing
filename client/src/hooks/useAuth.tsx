import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getApiUrl } from '../lib/api';

export type User = {
  id: string;
  email: string;
  name: string | null;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  impersonatedUser: { id: string; name: string | null; email: string } | null;
  setImpersonatedUser: (user: { id: string; name: string | null; email: string } | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedUser, setImpersonatedUser] = useState<{ id: string; name: string | null; email: string } | null>(null);

  useEffect(() => {
    fetch(getApiUrl('/api/auth/me'), { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not logged in');
      })
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, impersonatedUser, setImpersonatedUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
