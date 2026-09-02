'use client';
import React from 'react';
import { PageHeader, EmptyState, Card } from './ui/primitives';
import { Icon } from './ui/icons';

export default function PlaceholderPage({ title, subtitle, icon, description }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <EmptyState
          icon={<Icon name={icon || 'products'} size={28} />}
          title={`${title} — à venir`}
          description={
            description ||
            `Cette section sera construite dans une prochaine étape et utilisera les données réelles de l'API Django.`
          }
        />
      </Card>
    </div>
  );
}
