import { useI18n } from '@/i18n/LanguageProvider';
import { Megaphone, ShieldAlert, Gavel } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HowItWorks({ className }: { className?: string }) {
  const { t } = useI18n();

  const steps = [
    {
      icon: Megaphone,
      title: t('howItWorks.step1.title'),
      desc: t('howItWorks.step1.desc'),
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: ShieldAlert,
      title: t('howItWorks.step2.title'),
      desc: t('howItWorks.step2.desc'),
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      icon: Gavel,
      title: t('howItWorks.step3.title'),
      desc: t('howItWorks.step3.desc'),
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      <h2 className="px-1 text-xl font-semibold text-white/90">{t('howItWorks.title')}</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10"
          >
            <div className={cn('mb-4 inline-flex rounded-lg p-3', step.bg)}>
              <step.icon className={cn('h-6 w-6', step.color)} />
            </div>

            <h3 className="mb-2 text-lg font-medium text-white transition-colors group-hover:text-blue-200">
              {step.title}
            </h3>

            <p className="text-sm leading-relaxed text-gray-400 transition-colors group-hover:text-gray-300">
              {step.desc}
            </p>

            {/* Step Number Background */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl transition-all group-hover:bg-white/10" />
            <div className="absolute right-4 top-4 select-none font-mono text-4xl font-bold text-white/5">
              0{i + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
