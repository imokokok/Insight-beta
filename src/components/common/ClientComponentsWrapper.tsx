'use client';

import type { ReactNode } from 'react';

import { Onboarding, FirstTimeTour, useFirstTimeTour } from '@/features/onboarding/components';

interface ClientComponentsWrapperProps {
  children: ReactNode;
}

function TourWrapper() {
  // 临时禁用新手引导
  return null;
  // const { showTour, isReady, dismissTour } = useFirstTimeTour();
  // if (!isReady) return null;
  // return <FirstTimeTour isOpen={showTour} onComplete={dismissTour} onSkip={dismissTour} />;
}

export function ClientComponentsWrapper({ children }: ClientComponentsWrapperProps) {
  return (
    <>
      {children}
      {/* 临时禁用 onboarding 弹窗 */}
      {/* <Onboarding /> */}
      <TourWrapper />
    </>
  );
}
