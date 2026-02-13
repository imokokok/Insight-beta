'use client';

import React from 'react';

import { CardEnhanced, StatusBadge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { ProtocolHighlight } from '../constants/protocols';

interface HeroActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}

export const HeroActionCard = React.memo(function HeroActionCard({
  icon,
  title,
  description,
  onClick,
  primary,
}: HeroActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center gap-3 rounded-2xl p-6 transition-all duration-200',
        primary
          ? 'bg-primary text-white shadow-lg shadow-primary-500/25 hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-500/30'
          : 'hover:text-primary-dark bg-white text-gray-700 shadow-md hover:shadow-lg',
      )}
    >
      <div
        className={cn(
          'rounded-xl p-3',
          primary ? 'bg-white/20' : 'bg-primary/5 group-hover:bg-primary/10',
        )}
      >
        {icon}
      </div>
      <div className="text-center">
        <h3 className="font-semibold">{title}</h3>
        <p className={cn('text-sm', primary ? 'text-primary/10' : 'text-gray-500')}>
          {description}
        </p>
      </div>
    </button>
  );
});

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const FeatureCard = React.memo(function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
});

interface ProtocolCardProps {
  protocol: ProtocolHighlight;
}

export const ProtocolCard = React.memo(function ProtocolCard({ protocol }: ProtocolCardProps) {
  const { t } = useI18n();

  const statusConfig = {
    active: { status: 'active' as const, color: 'emerald' },
    beta: { status: 'pending' as const, color: 'amber' },
    coming_soon: { status: 'offline' as const, color: 'gray' },
  };

  return (
    <CardEnhanced hover className="group cursor-pointer border-0 shadow-sm" clickable>
      <div className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{protocol.icon}</span>
            <div>
              <h3 className="group-hover:text-primary-dark text-lg font-semibold text-gray-900 transition-colors">
                {protocol.name}
              </h3>
              <StatusBadge
                status={statusConfig[protocol.status].status}
                text={
                  protocol.status === 'active'
                    ? t('home.protocolStatus.active')
                    : protocol.status === 'beta'
                      ? t('home.protocolStatus.beta')
                      : t('home.protocolStatus.comingSoon')
                }
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="pt-0">
        <p className="mb-4 text-sm text-gray-600">{protocol.description}</p>
        <div className="flex flex-wrap gap-2">
          {protocol.features.map((feature) => (
            <span
              key={feature}
              className="text-primary-dark rounded-full bg-primary/10 px-2 py-1 text-xs"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </CardEnhanced>
  );
});
