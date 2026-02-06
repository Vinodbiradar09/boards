"use client";
import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from "react";

export interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin?: boolean;
  image?: string;
  organization: {
    id: string;
    name: string;
  };
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(
  undefined,
);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/user");
      if (response.status === 401) {
        setUser(null);
        setError(null);
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const userData = await response.json();
      setUser(userData);
      setError(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch user");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    fetchUser();
  };
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);
  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
