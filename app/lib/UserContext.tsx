import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

export type UserData = any; // Replace with your user type if available

interface UserContextType {
  user: UserData | null;
  isLoading: boolean;
  setUser: (user: UserData | null) => void;
  refetchUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within a UserProvider');
  return context;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { data: session } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUser = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/current');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id && !user) {
      fetchUser();
    } else if (!session?.user?.id) {
      setUser(null);
    }
    // eslint-disable-next-line
  }, [session?.user?.id]);

  return (
    <UserContext.Provider value={{ user, isLoading, setUser, refetchUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
};
