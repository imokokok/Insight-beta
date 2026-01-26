'use client';

import React from 'react';
import { Onboarding } from '@/components/features/onboarding/Onboarding';

interface ClientComponentsWrapperProps {
  children: React.ReactNode;
}

export function ClientComponentsWrapper({ children }: ClientComponentsWrapperProps) {
  return (
    <>
      {children}
      <Onboarding />
    </>
  );
}
