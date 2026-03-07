'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  Globe,
  Layers,
  AlertTriangle,
  Compass,
  ArrowRight,
  Link2,
  Zap,
  Activity,
} from 'lucide-react';

import { cn } from '@/shared/utils';

interface NavItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  bgColor: string;
}

interface QuickNavGridProps {
  isLoading?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Price Comparison',
    description: 'Compare prices across protocols',
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/compare/price',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Protocols',
    description: 'Explore oracle protocols',
    icon: <Layers className="h-5 w-5" />,
    href: '/protocols',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  {
    title: 'Cross-Chain',
    description: 'Multi-chain analytics',
    icon: <Globe className="h-5 w-5" />,
    href: '/cross-chain',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'Alerts',
    description: 'Monitor anomalies',
    icon: <AlertTriangle className="h-5 w-5" />,
    href: '/alerts',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    title: 'Explore',
    description: 'Discover new feeds',
    icon: <Compass className="h-5 w-5" />,
    href: '/explore',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
];

const protocolItems = [
  {
    name: 'Chainlink',
    icon: <Link2 className="h-4 w-4" />,
    color: 'text-blue-400',
    href: '/protocols/chainlink',
  },
  {
    name: 'Pyth',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-yellow-400',
    href: '/protocols/pyth',
  },
  {
    name: 'API3',
    icon: <Activity className="h-4 w-4" />,
    color: 'text-emerald-400',
    href: '/protocols/api3',
  },
  {
    name: 'Band',
    icon: <Globe className="h-4 w-4" />,
    color: 'text-purple-400',
    href: '/protocols/band',
  },
];

export function QuickNavGrid({ isLoading }: QuickNavGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Navigation Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {navItems.map((item, index) => (
          <motion.a
            key={item.title}
            href={item.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="group relative"
          >
            <div className="relative h-full overflow-hidden rounded-xl border border-border/30 bg-background/30 p-4 backdrop-blur-sm transition-all duration-300 hover:border-border/60 hover:bg-background/50">
              <div className="flex h-full flex-col">
                <div className={cn('mb-3 w-fit rounded-lg p-2.5', item.bgColor, item.color)}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="mb-0.5 text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-primary">
                  <span>Open</span>
                  <ArrowRight className="h-3 w-3 transform transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
              {/* Hover glow */}
              <div
                className={cn(
                  'absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100',
                  item.bgColor,
                )}
              />
            </div>
          </motion.a>
        ))}
      </div>

      {/* Protocol Quick Links */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        <span className="mr-2 text-xs text-muted-foreground">Quick access:</span>
        {protocolItems.map((protocol, index) => (
          <motion.a
            key={protocol.name}
            href={protocol.href}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: 0.3 + index * 0.05 }}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
              'border border-border/30 bg-background/30 backdrop-blur-sm',
              'transition-all duration-300 hover:border-border/60 hover:bg-background/50',
              protocol.color,
            )}
          >
            {protocol.icon}
            {protocol.name}
          </motion.a>
        ))}
      </div>
    </div>
  );
}
