'use client';

import type { ReactNode } from 'react';

import { Onboarding } from '@/features/onboarding';
import { FirstTimeTour, useFirstTimeTour } from '@/features/onboarding/components/Onboarding/FirstTimeTour';

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
    </>
  );
}
