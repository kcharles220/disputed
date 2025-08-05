'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const StatusContext = createContext<{ serverDown: boolean }>({ serverDown: false });

export function StatusProvider({ children }: { children: ReactNode }) {
  const [serverDown, setServerDown] = useState(false);

  useEffect(() => {
  const checkServer = async () => {
    try {
      const res = await fetch(`/api/proxy/health`);
      if (res.ok) {
        setServerDown(false);
      } else {
        setServerDown(true);
      }
    } catch (err) {
      setServerDown(true);
    }
  };
  checkServer();
  const interval = setInterval(checkServer, 10000);
  return () => clearInterval(interval);
}, []);

  return (
    <StatusContext.Provider value={{ serverDown }}>
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  return useContext(StatusContext);
}