'use client';
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import { AdminThemeProvider, useAdminTheme } from '@/components/admin/ui/theme';
import AdminGuard from './AdminGuard';
import { LanguageProvider } from '@/context/LanguageContext';

function AdminFrame({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme } = useAdminTheme();

  return (
    <div className={`admin-root ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex min-h-dvh">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--admin-surface)',
            color: 'var(--admin-text)',
            border: '1px solid var(--admin-border)',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: 'var(--admin-accent)', secondary: '#fff' } },
        }}
      />
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <LanguageProvider>
      <AdminGuard>
        <AdminThemeProvider>
          <AdminFrame>{children}</AdminFrame>
        </AdminThemeProvider>
      </AdminGuard>
    </LanguageProvider>
  );
}
