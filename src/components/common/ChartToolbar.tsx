/**
 * ChartToolbar Component
 * A flexible and customizable toolbar for chart interactions
 * - Zoom in/out and reset
 * - Export to different formats (PNG, SVG, CSV)
 * - Fullscreen mode
 * - Animation, legend, and grid toggles
 * - Settings panel
 */

import { useState, useCallback, memo, type ReactNode } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  RefreshCw,
  Settings,
  Image,
  FileText,
  Table,
  Zap,
  List as ListIcon,
  Grid3x3 as GridIcon,
} from 'lucide-react';

import { cn } from '@/shared/utils';

export interface ChartToolbarProps {
  className?: string;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  showZoom?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  currentZoom?: number;
  showRefresh?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showExport?: boolean;
  onExport?: (format: 'png' | 'svg' | 'csv') => void;
  showFullscreen?: boolean;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  showAnimationToggle?: boolean;
  animation?: boolean;
  onToggleAnimation?: (value: boolean) => void;
  showLegendToggle?: boolean;
  showLegend?: boolean;
  onToggleLegend?: (value: boolean) => void;
  showGridToggle?: boolean;
  showGrid?: boolean;
  onToggleGrid?: (value: boolean) => void;
  showSettings?: boolean;
  onSettings?: () => void;
  disabled?: boolean;
}

const iconSizeMap = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const ChartToolbar = memo(function ChartToolbar({
  className,
  children,
  size = 'md',
  showZoom = true,
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn = true,
  canZoomOut = true,
  currentZoom = 1,
  showRefresh = true,
  onRefresh,
  isRefreshing = false,
  showExport = true,
  onExport,
  showFullscreen = true,
  onFullscreen,
  isFullscreen = false,
  showAnimationToggle = false,
  animation = true,
  onToggleAnimation,
  showLegendToggle = false,
  showLegend = true,
  onToggleLegend,
  showGridToggle = false,
  showGrid = true,
  onToggleGrid,
  showSettings = false,
  onSettings,
  disabled = false,
}: ChartToolbarProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(animation);
  const [showLegendState, setShowLegendState] = useState(showLegend);
  const [showGridState, setShowGridState] = useState(showGrid);

  const handleZoomIn = useCallback(() => {
    onZoomIn?.();
  }, [onZoomIn]);

  const handleZoomOut = useCallback(() => {
    onZoomOut?.();
  }, [onZoomOut]);

  const handleReset = useCallback(() => {
    onReset?.();
  }, [onReset]);

  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  const handleExport = useCallback(
    (format: 'png' | 'svg' | 'csv') => {
      onExport?.(format);
      setIsExportMenuOpen(false);
    },
    [onExport],
  );

  const toggleAnimation = useCallback(() => {
    const newValue = !isAnimating;
    setIsAnimating(newValue);
    onToggleAnimation?.(newValue);
  }, [isAnimating, onToggleAnimation]);

  const toggleLegend = useCallback(() => {
    const newValue = !showLegendState;
    setShowLegendState(newValue);
    onToggleLegend?.(newValue);
  }, [showLegendState, onToggleLegend]);

  const toggleGrid = useCallback(() => {
    const newValue = !showGridState;
    setShowGridState(newValue);
    onToggleGrid?.(newValue);
  }, [showGridState, onToggleGrid]);

  const buttonClass = cn(
    'flex items-center justify-center rounded-md border border-border/50 bg-transparent p-0.5',
    'text-foreground/80 hover:bg-muted/50 hover:text-foreground',
    'focus:outline-none focus:ring-2 focus:ring-primary/50',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'transition-colors duration-200 ease-in-out',
    size === 'sm' && 'h-6 w-6',
    size === 'md' && 'h-8 w-8',
    size === 'lg' && 'h-10 w-10',
  );

  const activeButtonClass = cn(
    'flex items-center justify-center rounded-md border border-primary/50 bg-primary/10 p-0.5',
    'text-primary hover:bg-primary/20',
    'focus:outline-none focus:ring-2 focus:ring-primary/50',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'transition-colors duration-200 ease-in-out',
    size === 'sm' && 'h-6 w-6',
    size === 'md' && 'h-8 w-8',
    size === 'lg' && 'h-10 w-10',
  );

  const iconClass = iconSizeMap[size];
  const divider = <div className="h-4 w-px bg-border/50" />;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/50 p-1.5 shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {children}
      {children && divider}

      {showZoom && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={disabled || !canZoomIn}
            className={buttonClass}
            title="Zoom In"
          >
            <ZoomIn className={iconClass} />
          </button>
          <span className="min-w-[3.5rem] text-center text-xs font-medium text-muted-foreground">
            {Math.round(currentZoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={disabled || !canZoomOut}
            className={buttonClass}
            title="Zoom Out"
          >
            <ZoomOut className={iconClass} />
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={disabled || currentZoom === 1}
            className={buttonClass}
            title="Reset Zoom"
          >
            <Maximize2 className={iconClass} />
          </button>
        </div>
      )}

      {showZoom && (showRefresh || showExport || showFullscreen) && divider}

      {showRefresh && (
        <button
          type="button"
          onClick={handleRefresh}
          disabled={disabled || isRefreshing}
          className={buttonClass}
          title="Refresh"
        >
          <RefreshCw className={cn(iconClass, isRefreshing && 'animate-spin')} />
        </button>
      )}

      {showExport && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            disabled={disabled}
            className={buttonClass}
            title="Export"
          >
            <Download className={iconClass} />
          </button>
          <AnimatePresence>
            {isExportMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.1, ease: 'easeOut' }}
                className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-border/50 bg-popover p-2 shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => handleExport('png')}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                >
                  <Image className="h-4 w-4" />
                  Export as PNG
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('svg')}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                >
                  <FileText className="h-4 w-4" />
                  Export as SVG
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                >
                  <Table className="h-4 w-4" />
                  Export as CSV
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {showFullscreen && (
        <button
          type="button"
          onClick={onFullscreen}
          disabled={disabled}
          className={buttonClass}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className={iconClass} /> : <Maximize2 className={iconClass} />}
        </button>
      )}

      {(showAnimationToggle || showLegendToggle || showGridToggle) && (
        <>
          {divider}
          <div className="flex items-center gap-1">
            {showAnimationToggle && (
              <button
                type="button"
                onClick={toggleAnimation}
                disabled={disabled}
                className={isAnimating ? activeButtonClass : buttonClass}
                title="Toggle Animation"
              >
                <Zap className={iconClass} />
              </button>
            )}
            {showLegendToggle && (
              <button
                type="button"
                onClick={toggleLegend}
                disabled={disabled}
                className={showLegendState ? activeButtonClass : buttonClass}
                title="Toggle Legend"
              >
                <ListIcon className={iconClass} />
              </button>
            )}
            {showGridToggle && (
              <button
                type="button"
                onClick={toggleGrid}
                disabled={disabled}
                className={showGridState ? activeButtonClass : buttonClass}
                title="Toggle Grid"
              >
                <GridIcon className={iconClass} />
              </button>
            )}
          </div>
        </>
      )}

      {showSettings && (
        <>
          {divider}
          <button
            type="button"
            onClick={onSettings}
            disabled={disabled}
            className={buttonClass}
            title="Settings"
          >
            <Settings className={iconClass} />
          </button>
        </>
      )}
    </div>
  );
});

export default ChartToolbar;
