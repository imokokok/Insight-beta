'use client';

import type { ReactNode } from 'react';

import { GasCacheWarmer } from '@/components/features/gas/GasCacheWarmer';
import { Onboarding, FirstTimeTour, useFirstTimeTour } from '@/components/features/onboarding';

interface ClientComponentsWrapperProps {
  children: ReactNode;
}

function TourWrapper() {
  const { showTour, isReady, dismissTour } = useFirstTimeTour();

  if (!isReady) return null;

  return <FirstTimeTour isOpen={showTour} onComplete={dismissTour} onSkip={dismissTour} />;
}

export function ClientComponentsWrapper({ children }: ClientComponentsWrapperProps) {
  return (
    <>
      {children}
      <Onboarding />
      <TourWrapper />
      <GasCacheWarmer />
    </>
  );
}
