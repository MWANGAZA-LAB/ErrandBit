/**
 * Authentication Context
 * Provides authentication state throughout the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (sessionId: string, code: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // AUTHENTICATION BYPASSED - Auto-login with mock user
    // TODO: Re-enable authentication later
    const mockUser: User = {
      id: 'dev-user-' + Date.now(),
      phone: '+1234567890',
      display_name: 'Dev User',
      created_at: new Date().toISOString()
    };
    
    // Store mock credentials
    localStorage.setItem('token', 'dev-bypass-token-' + Date.now());
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    setUser(mockUser);
    setIsLoading(false);
    
    /* ORIGINAL CODE - COMMENTED OUT FOR LATER
    // Check if user is already authenticated
    if (authService.isAuthenticated()) {
      loadUser();
    } else {
      setIsLoading(false);
    }
    */
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      authService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (sessionId: string, code: string) => {
    const response = await authService.verifyOTP(sessionId, code);
    setUser(response.user as User);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
