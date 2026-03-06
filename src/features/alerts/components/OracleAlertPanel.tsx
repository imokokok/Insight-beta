'use client';

import { useState, useCallback, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronDown, ChevronUp, X, BarChart3 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

import { cn } from '@/shared/utils';

import { UnifiedAlertPanel, CrossProtocolAlertComparison } from './';
import type { OracleProtocol } from '@/types/oracle/protocol';
import type { AlertHistory } from './UnifiedAlertPanel';

interface OracleAlertPanelProps {
  protocol: OracleProtocol;
  compact?: boolean;
  position?: 'top' | 'bottom' | 'floating';
  defaultExpanded?: boolean;
  onAlertClick?: (alert: AlertHistory) => void;
}

export function OracleAlertPanel({
  protocol,
  compact = false,
  position = 'bottom',
  defaultExpanded = false,
  onAlertClick,
}: OracleAlertPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showComparison, setShowComparison] = useState(false);

  const mockAlerts = useMemo(
    () => [
      {
        id: '1',
        title: '价格偏差警告',
        severity: 'high' as const,
        timestamp: new Date().toISOString(),
        active: true,
      },
      {
        id: '2',
        title: '心跳超时',
        severity: 'medium' as const,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        active: true,
      },
    ],
    [],
  );

  const activeAlerts = mockAlerts.filter((a) => a.active).length;

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
  }, []);

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-5 w-5 text-primary" />
                {activeAlerts > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {activeAlerts}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">{protocol.toUpperCase()} 告警</span>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowComparison(true)}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>跨协议对比</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="ghost" size="sm" onClick={handleToggleExpand}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'w-full',
              position === 'floating' && 'fixed bottom-4 right-4 z-50 w-96',
            )}
          >
            <Card
              className={cn(
                'overflow-hidden',
                position === 'floating' && 'shadow-lg',
              )}
            >
              <div className="flex items-center justify-between border-b p-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{protocol.toUpperCase()} 告警管理</h3>
                  <Badge variant="secondary">{activeAlerts} 活跃</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowComparison(true)}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>跨协议对比</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button variant="ghost" size="sm" onClick={handleClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[600px]">
                <CardContent className="p-0">
                  <UnifiedAlertPanel
                    protocols={[protocol]}
                    onAlertClick={onAlertClick}
                  />
                </CardContent>
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {showComparison && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowComparison(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <div className="flex items-center justify-between border-b p-4">
                <h3 className="text-lg font-semibold">跨协议告警对比</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowComparison(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="p-4">
                  <CrossProtocolAlertComparison />
                </div>
              </ScrollArea>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
