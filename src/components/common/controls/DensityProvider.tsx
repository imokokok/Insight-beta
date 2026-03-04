'use client';

/**
 * DensityProvider - 信息密度上下文
 * 提供紧凑/标准/宽松三种密度模式
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
  type CSSProperties,
} from 'react';

export type DensityMode = 'compact' | 'balanced' | 'normal' | 'comfortable';

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
  compact: {
    mode: 'compact',
    spacing: {
      section: '1rem',
      item: '0.5rem',
      padding: '0.5rem',
      gap: '0.5rem',
      xs: '0.25rem',
      sm: '0.5rem',
      md: '0.75rem',
      lg: '1rem',
      xl: '1.5rem',
    },
    gap: {
      grid: '0.5rem',
      section: '0.5rem',
      card: '0.5rem',
    },
    fontSize: {
      base: '0.875rem',
      small: '0.75rem',
      large: '1rem',
    },
    borderRadius: '0.375rem',
  },
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
  normal: {
    mode: 'normal',
    spacing: {
      section: '1.5rem',
      item: '0.75rem',
      padding: '0.75rem',
      gap: '0.75rem',
      xs: '0.5rem',
      sm: '0.75rem',
      md: '1rem',
      lg: '1.25rem',
      xl: '1.5rem',
    },
    gap: {
      grid: '1rem',
      section: '1rem',
      card: '0.75rem',
    },
    fontSize: {
      base: '1rem',
      small: '0.875rem',
      large: '1.125rem',
    },
    borderRadius: '0.5rem',
  },
  comfortable: {
    mode: 'comfortable',
    spacing: {
      section: '2rem',
      item: '1rem',
      padding: '1rem',
      gap: '1rem',
      xs: '0.5rem',
      sm: '0.75rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
    gap: {
      grid: '1.5rem',
      section: '1.5rem',
      card: '1rem',
    },
    fontSize: {
      base: '1rem',
      small: '0.875rem',
      large: '1.25rem',
    },
    borderRadius: '0.75rem',
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
  defaultDensity?: DensityMode;
  storageKey?: string;
}

export function DensityProvider({
  children,
  defaultDensity = 'balanced',
  storageKey = 'insight-density-mode',
}: DensityProviderProps) {
  const [density, setDensityState] = useState<DensityMode>(() => {
    if (typeof window === 'undefined') return defaultDensity;
    try {
      const stored = localStorage.getItem(storageKey);
      if (
        stored &&
        (stored === 'compact' ||
          stored === 'balanced' ||
          stored === 'normal' ||
          stored === 'comfortable')
      ) {
        return stored;
      }
    } catch {
      // Ignore localStorage errors
    }
    return defaultDensity;
  });

  const config = densityConfigs[density];

  const setDensity = useCallback(
    (mode: DensityMode) => {
      setDensityState(mode);
      try {
        localStorage.setItem(storageKey, mode);
      } catch {
        // Ignore localStorage errors
      }
    },
    [storageKey],
  );

  const toggleDensity = useCallback(() => {
    const modes: DensityMode[] = ['compact', 'balanced', 'normal', 'comfortable'];
    const currentIndex = modes.indexOf(density);
    const safeIndex = currentIndex >= 0 ? currentIndex : 1;
    const nextIndex = (safeIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    if (nextMode) {
      setDensity(nextMode);
    }
  }, [density, setDensity]);

  const getSpacing = useCallback(
    (key: keyof DensityConfig['spacing']) => config.spacing[key],
    [config],
  );

  const getFontSize = useCallback(
    (key: keyof DensityConfig['fontSize']) => config.fontSize[key],
    [config],
  );

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
        density,
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
