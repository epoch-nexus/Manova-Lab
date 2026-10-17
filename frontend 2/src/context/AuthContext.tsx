import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

export interface User {
  id?: string;
  email: string;
  name?: string | null;
  photoURL?: string | null;
  affiliation?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token') || localStorage.getItem('accessToken')
  );
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default fallback mock user if token exists or local dev session
    if (localStorage.getItem('token') || localStorage.getItem('accessToken')) {
      return {
        email: 'dr.arun@stanford.edu',
        name: 'Dr. Arun Vance',
        photoURL: null,
      };
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      let storedToken = localStorage.getItem('token') || localStorage.getItem('accessToken');
      let authenticated = false;

      if (storedToken) {
        try {
          const profile = await api.auth.me();
          if (profile) {
            const userData: User = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              photoURL: profile.photoURL || null,
            };
            setUser(userData);
            setToken(storedToken);
            localStorage.setItem('user', JSON.stringify(userData));
            authenticated = true;
          }
        } catch {
          // Stored token is invalid or expired
          console.warn('Stored token expired or invalid, auto-renewing demo session...');
        }
      }

      if (!authenticated) {
        // Auto-login with default demo researcher credentials
        try {
          const res = await api.auth.login('dr.arun@stanford.edu', 'StanfordPrecision#2025');
          if (res?.token) {
            const userData: User = {
              id: res.researcher?.id,
              email: res.researcher?.email || 'dr.arun@stanford.edu',
              name: res.researcher?.name || 'Dr. Arun Vance',
              photoURL: null,
            };
            setToken(res.token);
            setUser(userData);
            localStorage.setItem('token', res.token);
            localStorage.setItem('accessToken', res.token);
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (err) {
          console.warn('Auto-login fallback unavailable:', err);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('accessToken', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  };

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updated };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
