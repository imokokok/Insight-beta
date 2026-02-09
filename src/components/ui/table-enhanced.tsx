'use client';

import * as React from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils';

// Table Row with hover and selection effects
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  onSelect?: () => void;
  index?: number;
}

const TableRowEnhanced = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected, onSelect, index = 0, children, ...props }, ref) => {
    return (
      <motion.tr
        ref={ref}
        className={cn(
          'group cursor-pointer border-b border-purple-100/50 transition-colors duration-200',
          'hover:bg-purple-50/50',
          selected && 'bg-purple-100/30 hover:bg-purple-100/40',
          className
        )}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        onClick={onSelect}
        whileHover={{ backgroundColor: 'rgba(147, 51, 234, 0.05)' }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...props as any}
      >
        {children}
      </motion.tr>
    );
  }
);
TableRowEnhanced.displayName = 'TableRowEnhanced';

// Sortable Table Header
interface TableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

const TableHeaderEnhanced = React.forwardRef<HTMLTableCellElement, TableHeaderProps>(
  ({ className, sortable, sortDirection, onSort, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          'h-12 px-4 text-left align-middle font-medium text-purple-700/70',
          sortable && 'cursor-pointer select-none hover:text-purple-900',
          className
        )}
        onClick={sortable ? onSort : undefined}
        {...props}
      >
        <div className="flex items-center gap-2">
          {children}
          {sortable && (
            <span className="flex flex-col">
              <motion.svg
                width="8"
                height="5"
                viewBox="0 0 8 5"
                fill="currentColor"
                animate={{ opacity: sortDirection === 'asc' ? 1 : 0.3 }}
                className="-mb-0.5"
              >
                <path d="M4 0L0 5H8L4 0Z" />
              </motion.svg>
              <motion.svg
                width="8"
                height="5"
                viewBox="0 0 8 5"
                fill="currentColor"
                animate={{ opacity: sortDirection === 'desc' ? 1 : 0.3 }}
                className="-mt-0.5"
              >
                <path d="M4 5L8 0H0L4 5Z" />
              </motion.svg>
            </span>
          )}
        </div>
      </th>
    );
  }
);
TableHeaderEnhanced.displayName = 'TableHeaderEnhanced';

// Expandable Table Row
interface ExpandableRowProps {
  children: React.ReactNode;
  expandedContent: React.ReactNode;
  className?: string;
}

function ExpandableTableRow({ children, expandedContent, className }: ExpandableRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <>
      <TableRowEnhanced
        className={className}
        onSelect={() => setIsExpanded(!isExpanded)}
      >
        <td className="p-4">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-purple-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.div>
            {children}
          </div>
        </td>
      </TableRowEnhanced>
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <td colSpan={100} className="p-0">
              <motion.div
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                exit={{ y: -10 }}
                className="bg-purple-50/30 p-4"
              >
                {expandedContent}
              </motion.div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

// Table Container with loading state
interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
}

const TableContainer = React.forwardRef<HTMLDivElement, TableContainerProps>(
  ({ className, loading, empty, emptyMessage = 'No data available', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-xl border border-purple-100/50 bg-white/50 backdrop-blur-sm',
          className
        )}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <span className="text-sm text-purple-600">Loading...</span>
            </div>
          </div>
        )}
        
        {empty && !loading ? (
          <div className="flex h-48 flex-col items-center justify-center text-purple-400">
            <svg className="mb-2 h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              {children}
            </table>
          </div>
        )}
      </div>
    );
  }
);
TableContainer.displayName = 'TableContainer';

export {
  TableRowEnhanced,
  TableHeaderEnhanced,
  ExpandableTableRow,
  TableContainer,
};
