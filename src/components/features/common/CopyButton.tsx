'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useI18n } from '@/i18n/LanguageProvider';
import { logger } from '@/lib/logger';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  iconSize?: number;
}

export function CopyButton({ text, label, className, iconSize = 14 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: t('common.copied'),
        message: label ? `${label} ${t('common.copied')}` : t('common.copied'),
        type: 'success',
        duration: 1500,
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy', { error: err });
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center justify-center rounded-md p-1.5 transition-all duration-200',
        copied
          ? 'bg-green-50 text-green-600 hover:bg-green-100'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800',
        className,
      )}
      title={label || 'Copy'}
    >
      <div className="relative">
        <Copy
          size={iconSize}
          className={cn(
            'absolute left-0 top-0 transition-all duration-300',
            copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
          )}
        />
        <Check
          size={iconSize}
          className={cn(
            'transition-all duration-300',
            copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
          )}
        />
        {/* Spacer to keep size */}
        <div className="invisible" style={{ width: iconSize, height: iconSize }} />
      </div>
    </button>
  );
}
