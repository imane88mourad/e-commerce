'use client';
import React from 'react';
import PlaceholderPage from '@/components/admin/PlaceholderPage';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  return (
    <PlaceholderPage
      title={t('admin.settings.title')}
      subtitle={t('admin.settings.subtitle')}
      icon="settings"
    />
  );
}
