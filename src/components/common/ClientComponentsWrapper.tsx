'use client';

import type { ReactNode } from 'react';

interface ClientComponentsWrapperProps {
  children: ReactNode;
}

export function ClientComponentsWrapper({ children }: ClientComponentsWrapperProps) {
  return <>{children}</>;
}
