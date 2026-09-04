'use client';
import React from 'react';
import PlaceholderPage from '@/components/admin/PlaceholderPage';
import { useLanguage } from '@/context/LanguageContext';

export default function UsersPage() {
  const { t } = useLanguage();
  return (
    <PlaceholderPage
      title={t('admin.users.title')}
      subtitle={t('admin.users.subtitle')}
      icon="users"
    />
  );
}
