'use client';

import { createContext, useContext, type ReactNode, type CSSProperties } from 'react';

export type DensityMode = 'balanced';

export interface DensityConfig {
  mode: DensityMode;
  spacing: {
    section: string;
    item: string;
    padding: string;
    gap: string;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  gap: {
    grid: string;
    section: string;
    card: string;
  };
  fontSize: {
    base: string;
    small: string;
    large: string;
  };
  borderRadius: string;
}

const densityConfigs: Record<DensityMode, DensityConfig> = {
  balanced: {
    mode: 'balanced',
    spacing: {
      section: '1.25rem',
      item: '0.625rem',
      padding: '0.625rem',
      gap: '0.625rem',
      xs: '0.375rem',
      sm: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.25rem',
    },
    gap: {
      grid: '0.75rem',
      section: '0.75rem',
      card: '0.625rem',
    },
    fontSize: {
      base: '0.8125rem',
      small: '0.75rem',
      large: '0.9375rem',
    },
    borderRadius: '0.4375rem',
  },
};

interface DensityContextValue {
  density: DensityMode;
  config: DensityConfig;
  setDensity: (mode: DensityMode) => void;
  toggleDensity: () => void;
  getSpacing: (key: keyof DensityConfig['spacing']) => string;
  getFontSize: (key: keyof DensityConfig['fontSize']) => string;
  densityStyles: CSSProperties;
}

const DensityContext = createContext<DensityContextValue | null>(null);

export function useDensity(): DensityContextValue {
  const context = useContext(DensityContext);
  if (!context) {
    return {
      density: 'balanced',
      config: densityConfigs.balanced,
      setDensity: () => {},
      toggleDensity: () => {},
      getSpacing: (key) => densityConfigs.balanced.spacing[key],
      getFontSize: (key) => densityConfigs.balanced.fontSize[key],
      densityStyles: {},
    };
  }
  return context;
}

export interface DensityProviderProps {
  children: ReactNode;
}

export function DensityProvider({ children }: DensityProviderProps) {
  const config = densityConfigs.balanced;

  const setDensity = () => {};
  const toggleDensity = () => {};

  const getSpacing = (key: keyof DensityConfig['spacing']) => config.spacing[key];
  const getFontSize = (key: keyof DensityConfig['fontSize']) => config.fontSize[key];

  const densityStyles: CSSProperties = {
    '--density-section-spacing': config.spacing.section,
    '--density-item-spacing': config.spacing.item,
    '--density-padding': config.spacing.padding,
    '--density-gap': config.spacing.gap,
    '--density-font-base': config.fontSize.base,
    '--density-font-small': config.fontSize.small,
    '--density-font-large': config.fontSize.large,
    '--density-border-radius': config.borderRadius,
  } as CSSProperties;

  return (
    <DensityContext.Provider
      value={{
        density: 'balanced',
        config,
        setDensity,
        toggleDensity,
        getSpacing,
        getFontSize,
        densityStyles,
      }}
    >
      <div style={densityStyles}>{children}</div>
    </DensityContext.Provider>
  );
}

export default DensityProvider;
