"use client";

import React from "react";
import { Onboarding } from "./Onboarding";

interface ClientComponentsWrapperProps {
  children: React.ReactNode;
}

export function ClientComponentsWrapper({
  children,
}: ClientComponentsWrapperProps) {
  return (
    <>
      {children}
      <Onboarding />
    </>
  );
}
