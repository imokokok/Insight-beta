'use client';

import type { ReactNode } from 'react';
import { Onboarding } from '@/components/features/onboarding/Onboarding';

interface ClientComponentsWrapperProps {
  children: ReactNode;
}

export function ClientComponentsWrapper({ children }: ClientComponentsWrapperProps) {
  return (
    <>
      {children}
      <Onboarding />
    </>
  );
}
