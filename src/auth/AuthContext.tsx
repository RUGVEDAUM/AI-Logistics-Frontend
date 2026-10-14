import React, { createContext, useContext, useState, useEffect } from 'react';

// TODO: replace with real JWT API calls when the backend supports it

export interface User {
  id: string;
  name: string;
  email: string;
}

interface StoredAccount extends User {
  passwordHash: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'ai_logistics_registered_users';
const CURRENT_USER_KEY = 'ai_logistics_current_user';
const TOKEN_KEY = 'token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(CURRENT_USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRegisteredUsers = (): StoredAccount[] => {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      if (!raw) {
        // Pre-seed an admin account for convenience
        const defaultAdmin: StoredAccount = {
          id: '1',
          name: 'Admin User',
          email: 'admin@logistics.com',
          passwordHash: 'password123',
        };
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([defaultAdmin]));
        return [defaultAdmin];
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    const users = getRegisteredUsers();
    const account = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.passwordHash === password
    );

    if (!account) {
      throw new Error('Invalid email or password');
    }

    const sessionUser: User = {
      id: account.id,
      name: account.name,
      email: account.email,
    };

    const fakeToken = `fake-jwt-token-${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, fakeToken);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
  };

  const signup = async (name: string, email: string, password: string): Promise<void> => {
    const users = getRegisteredUsers();
    const normalizedEmail = email.toLowerCase().trim();

    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email already exists');
    }

    const newUser: StoredAccount = {
      id: Date.now().toString(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: password,
    };

    users.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    const sessionUser: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    };

    const fakeToken = `fake-jwt-token-${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, fakeToken);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
