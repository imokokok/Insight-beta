'use client';

/* eslint-disable @next/next/no-html-link-for-pages */
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('text-muted-foreground flex items-center gap-2 text-sm', className)}
    >
      <a href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </a>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <a
              href={item.href}
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {item.icon && <span className="text-base">{item.icon}</span>}
              <span>{item.label}</span>
            </a>
          ) : (
            <span className="text-foreground flex items-center gap-1 font-medium">
              {item.icon && <span className="text-base">{item.icon}</span>}
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}

// 预定义的面包屑路径
export function OracleBreadcrumb({ protocol, page }: { protocol?: string; page?: string }) {
  const items: BreadcrumbItem[] = [{ label: 'Oracle', href: '/oracle/dashboard' }];

  if (protocol) {
    items.push({
      label: 'Protocols',
      href: '/oracle/dashboard',
    });
    items.push({
      label: protocol.charAt(0).toUpperCase() + protocol.slice(1),
      icon: getProtocolIcon(protocol),
    });
  } else if (page) {
    items.push({ label: page });
  }

  return <Breadcrumb items={items} />;
}

function getProtocolIcon(protocol: string): string {
  const icons: Record<string, string> = {
    insight: '🔮',
    uma: '⚖️',
    chainlink: '🔗',
    pyth: '🐍',
    band: '🎸',
    api3: '📡',
    redstone: '💎',
    switchboard: '🎛️',
    flux: '⚡',
    dia: '📊',
  };
  return icons[protocol.toLowerCase()] || '🔮';
}
