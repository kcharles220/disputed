'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { UserProvider } from './lib/UserContext';
import I18nProvider from './i18n-provider' 

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <UserProvider>
        <I18nProvider>
          {children}
        </I18nProvider>
      </UserProvider>
    </SessionProvider>
  )
}
