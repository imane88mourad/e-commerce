'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import Loading from '@/components/Loading';

export default function AdminGuard({ children }) {
  const { token, userData, loading: ctxLoading } = useAppContext();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Wait for context to finish loading
    if (ctxLoading) return;

    // Not logged in → redirect to login
    if (!token) {
      router.replace('/login');
      return;
    }

    // Logged in but no user data yet → wait (fetchUserData may still be running)
    if (!userData) return;

    // Logged in but not admin → redirect to home
    if (userData.role !== 'admin' && !userData.is_staff) {
      router.replace('/');
      return;
    }

    setChecking(false);
  }, [token, userData, ctxLoading, router]);

  if (checking) {
    return <Loading />;
  }

  return children;
}
