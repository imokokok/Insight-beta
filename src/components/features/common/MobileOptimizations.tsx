'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Menu, X, ChevronDown, Search, Bell, User, Settings, LogOut } from 'lucide-react';

interface MobileOptimizationsContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  touchDevice: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

const MobileOptimizationsContext = createContext<MobileOptimizationsContextType | null>(null);

const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
};

export function useMobileOptimizations() {
  const context = useContext(MobileOptimizationsContext);
  if (!context) {
    throw new Error('useMobileOptimizations must be used within MobileOptimizationsProvider');
  }
  return context;
}

interface MobileOptimizationsProviderProps {
  children: ReactNode;
}

export function MobileOptimizationsProvider({ children }: MobileOptimizationsProviderProps) {
  const [screenWidth, setScreenWidth] = useState(0);
  const [screenHeight, setScreenHeight] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isMobile = screenWidth < BREAKPOINTS.mobile;
  const isTablet = screenWidth >= BREAKPOINTS.mobile && screenWidth < BREAKPOINTS.tablet;
  const isDesktop = screenWidth >= BREAKPOINTS.tablet;
  const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';
  const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDimensions = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  }, []);

  const toggleMobileMenu = useCallback(() => {
    if (isMobileMenuOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }, [isMobileMenuOpen, openMobileMenu, closeMobileMenu]);

  const value: MobileOptimizationsContextType = {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
    screenHeight,
    orientation,
    touchDevice,
    openMobileMenu,
    closeMobileMenu,
    toggleMobileMenu,
    isMobileMenuOpen,
  };

  return (
    <MobileOptimizationsContext.Provider value={value}>
      {children}
    </MobileOptimizationsContext.Provider>
  );
}

interface MobileHeaderProps {
  logo?: ReactNode;
  showSearch?: boolean;
  showNotifications?: boolean;
  showUserMenu?: boolean;
  onMenuClick?: () => void;
}

export function MobileHeader({
  logo,
  showSearch = true,
  showNotifications = true,
  showUserMenu = true,
  onMenuClick,
}: MobileHeaderProps) {
  const { isMobile, openMobileMenu, isMobileMenuOpen, touchDevice } = useMobileOptimizations();
  const [showSearchBar, setShowSearchBar] = useState(false);

  if (!isMobile) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick || openMobileMenu}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
            aria-label="Open menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-gray-600" />
            ) : (
              <Menu className="h-5 w-5 text-gray-600" />
            )}
          </button>
          {logo || <span className="font-bold text-lg text-gray-900">Insight</span>}
        </div>

        <div className="flex items-center gap-2">
          {showSearch && (
            <button
              onClick={() => setShowSearchBar(!showSearchBar)}
              className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </button>
          )}

          {showNotifications && (
            <button
              className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          )}

          {showUserMenu && (
            <button
              className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
              aria-label="User menu"
            >
              <User className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {showSearchBar && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search assertions, disputes..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}

interface MobileNavigationProps {
  items: Array<{
    label: string;
    href: string;
    icon?: ReactNode;
    badge?: number;
  }>;
  currentPath?: string;
  onItemClick?: (href: string) => void;
}

export function MobileNavigation({
  items,
  currentPath = '',
  onItemClick,
}: MobileNavigationProps) {
  const { isMobile, isMobileMenuOpen, closeMobileMenu } = useMobileOptimizations();

  if (!isMobile) {
    return null;
  }

  const handleItemClick = (href: string) => {
    onItemClick?.(href);
    closeMobileMenu();
  };

  if (!isMobileMenuOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 pt-14">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      <nav className="relative bg-white h-full w-72 max-w-[85vw] shadow-xl animate-in slide-in-from-left duration-300">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Navigation
          </h2>
        </div>

        <ul className="p-2 space-y-1" role="menu">
          {items.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <li key={item.href} role="none">
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleItemClick(item.href);
                  }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors touch-manipulation ${
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span className="flex-1 font-medium">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <ChevronDown className="h-4 w-4 rotate-90" aria-hidden="true" />
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation">
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation">
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Disconnect</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

interface TouchOptimizedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function TouchOptimizedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
}: TouchOptimizedButtonProps) {
  const { touchDevice } = useMobileOptimizations();

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 disabled:bg-purple-300',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-all duration-150 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        touch-manipulation
        min-h-[44px] min-w-[44px]
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      aria-busy={loading}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

interface ResponsiveTableProps {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  onRowClick?: (rowIndex: number) => void;
  emptyMessage?: string;
}

export function ResponsiveTable({
  headers,
  rows,
  onRowClick,
  emptyMessage = 'No data available',
}: ResponsiveTableProps) {
  const { isMobile, isTablet } = useMobileOptimizations();

  if (rows.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-3" role="list" aria-label={headers.join(', ')}>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            onClick={() => onRowClick?.(rowIndex)}
            role="listitem"
            className={`
              bg-white rounded-lg border border-gray-200 p-4 shadow-sm
              ${onRowClick ? 'cursor-pointer hover:border-purple-300 hover:shadow-md transition-all' : ''}
            `}
          >
            <div className="space-y-2">
              {row.map((cell, cellIndex) => (
                <div key={cellIndex} className="flex justify-between items-start">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {headers[cellIndex]}
                  </span>
                  <span className="text-sm text-gray-900 text-right max-w-[60%]">
                    {cell}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="min-w-full inline-block align-middle sm:block">
        <table className="min-w-full divide-y divide-gray-200 border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(rowIndex)}
                className={`
                  ${onRowClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}
                `}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'table' | 'chart';
  count?: number;
}

export function SkeletonLoader({ type = 'list', count = 3 }: SkeletonLoaderProps) {
  if (type === 'card') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-4/6" />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="h-8 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-3">
        <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
          ))}
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-3 p-4 bg-white border border-gray-100 rounded-lg">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-4 bg-gray-200 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="flex items-end gap-2 h-48">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 rounded-t animate-pulse"
              style={{ height: `${20 + Math.random() * 60}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-lg">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.mobile - 1}px)`);
}

export function useIsTablet() {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`,
  );
}

export function useIsDesktop() {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);
}
