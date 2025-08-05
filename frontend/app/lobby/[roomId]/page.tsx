'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function LobbyRedirect() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.roomId as string | undefined;
  const { t } = useTranslation('common');
  useEffect(() => {
    if (roomId) {
      // Redirect to join page with room code pre-filled
      router.push(`/join?room=${roomId.toUpperCase()}`);
    } else {
      // If no room ID, go back to home
      router.push('/');
    }
  }, [roomId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-indigo-600">
      <div className="text-white text-2xl">{t('redirecting')}</div>
    </div>
  );
}
