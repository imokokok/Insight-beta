'use client';

import type { ReactNode } from 'react';

import { GasCacheWarmer } from '@/features/gas/components/GasCacheWarmer';
import { Onboarding, FirstTimeTour, useFirstTimeTour } from '@/features/onboarding/components';

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
