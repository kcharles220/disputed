'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { UserProvider } from './lib/UserContext';
import I18nProvider from './lib/i18n-provider' 
import { StatusProvider } from './lib/status-provider';

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <UserProvider>
        <I18nProvider>
          <StatusProvider>
            {children}
          </StatusProvider>
        </I18nProvider>
      </UserProvider>
    </SessionProvider>
  )
}
