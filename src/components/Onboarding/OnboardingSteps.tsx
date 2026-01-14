import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
}

interface OnboardingStepsProps {
  currentStep: number;
  steps: OnboardingStep[];
  onNext: () => void;
  onSkip: () => void;
}

export function OnboardingSteps({
  currentStep,
  steps,
  onNext,
  onSkip,
}: OnboardingStepsProps) {
  const { t } = useI18n();
  const step = steps[currentStep];
  if (!step) return null;

  return (
    <>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="mb-4">{step.icon}</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {step.title}
        </h3>
        <p className="text-gray-600">{step.description}</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {steps.map((_, index) => (
            <div
              key={_.id}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index <= currentStep ? "bg-purple-600" : "bg-gray-300"
              )}
            />
          ))}
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t("onboarding.skipTour")}
        </button>
        <button
          onClick={onNext}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          {currentStep === steps.length - 1 ? (
            <>
              <Check className="w-4 h-4" />
              {t("onboarding.getStarted")}
            </>
          ) : (
            <>
              {t("onboarding.next")}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </>
  );
}
