'use client';

import { useState, useEffect } from 'react';

import { X, ChevronLeft, ChevronRight, Gavel, Filter, Eye, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';

const STORAGE_KEY = 'disputes_guide_completed';

interface GuideStep {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Gavel className="h-8 w-8 text-purple-600" />,
    titleKey: 'analytics:disputes.guide.step1Title',
    descriptionKey: 'analytics:disputes.guide.step1Desc',
  },
  {
    icon: <Filter className="h-8 w-8 text-blue-600" />,
    titleKey: 'analytics:disputes.guide.step2Title',
    descriptionKey: 'analytics:disputes.guide.step2Desc',
  },
  {
    icon: <Eye className="h-8 w-8 text-green-600" />,
    titleKey: 'analytics:disputes.guide.step3Title',
    descriptionKey: 'analytics:disputes.guide.step3Desc',
  },
  {
    icon: <Download className="h-8 w-8 text-orange-600" />,
    titleKey: 'analytics:disputes.guide.step4Title',
    descriptionKey: 'analytics:disputes.guide.step4Desc',
  },
];

interface WelcomeGuideProps {
  onComplete?: () => void;
}

export function WelcomeGuide({ onComplete }: WelcomeGuideProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete?.();
  };

  const handleSkip = () => {
    handleClose();
  };

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = GUIDE_STEPS[currentStep];

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-8 w-8 p-0"
          onClick={handleSkip}
        >
          <X className="h-4 w-4" />
        </Button>

        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            {step.icon}
          </div>
          <CardTitle className="text-xl">{t(step.titleKey)}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            {t(step.descriptionKey)}
          </p>

          <div className="flex justify-center gap-1">
            {GUIDE_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={handleSkip}
            >
              {t('common.skip')}
            </Button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handlePrev}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {t('common.previous')}
                </Button>
              )}
              <Button onClick={handleNext}>
                {currentStep === GUIDE_STEPS.length - 1 ? t('common.finish') : t('common.next')}
                {currentStep < GUIDE_STEPS.length - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
