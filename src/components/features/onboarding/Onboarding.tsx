"use client";

import React, { useState, useEffect } from "react";
import { X, AlertCircle, BarChart2, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { RoleSelection } from "./Onboarding/RoleSelection";
import { OnboardingSteps } from "./Onboarding/OnboardingSteps";

export type UserRole =
  | "developer"
  | "protocol_team"
  | "oracle_operator"
  | "general_user";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
}

interface OnboardingProps {
  onComplete?: () => void;
  className?: string;
}

export function Onboarding({ onComplete, className }: OnboardingProps) {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showRoleSelection, setShowRoleSelection] = useState(true);

  // Check if user has completed onboarding
  useEffect(() => {
    const hasCompleted = localStorage.getItem("insight-onboarding-completed");
    if (!hasCompleted) {
      setIsOpen(true);
    }
  }, []);

  // Common welcome step
  const welcomeStep: OnboardingStep = {
    id: "welcome",
    title: t("onboarding.welcome"),
    description: t("onboarding.welcomeDesc"),
    icon: <AlertCircle className="w-10 h-10 text-purple-600" />,
  };

  // Current steps based on role selection
  const getCurrentSteps = (): OnboardingStep[] => {
    if (showRoleSelection) {
      return [welcomeStep];
    }
    if (!selectedRole) {
      return [welcomeStep];
    }

    // Role-specific steps with translations
    const roleStepsConfig = {
      developer: [
        {
          id: "dev_api",
          title: t("onboarding.steps.developer.api.title"),
          description: t("onboarding.steps.developer.api.description"),
          icon: <FileText className="w-10 h-10 text-blue-600" />,
        },
        {
          id: "dev_integration",
          title: t("onboarding.steps.developer.integration.title"),
          description: t("onboarding.steps.developer.integration.description"),
          icon: <BarChart2 className="w-10 h-10 text-green-600" />,
        },
        {
          id: "dev_monitoring",
          title: t("onboarding.steps.developer.monitoring.title"),
          description: t("onboarding.steps.developer.monitoring.description"),
          icon: <AlertCircle className="w-10 h-10 text-purple-600" />,
        },
      ],
      protocol_team: [
        {
          id: "proto_monitoring",
          title: t("onboarding.steps.protocol_team.monitoring.title"),
          description: t(
            "onboarding.steps.protocol_team.monitoring.description",
          ),
          icon: <BarChart2 className="w-10 h-10 text-blue-600" />,
        },
        {
          id: "proto_disputes",
          title: t("onboarding.steps.protocol_team.disputes.title"),
          description: t("onboarding.steps.protocol_team.disputes.description"),
          icon: <Users className="w-10 h-10 text-orange-600" />,
        },
        {
          id: "proto_analytics",
          title: t("onboarding.steps.protocol_team.analytics.title"),
          description: t(
            "onboarding.steps.protocol_team.analytics.description",
          ),
          icon: <FileText className="w-10 h-10 text-green-600" />,
        },
      ],
      oracle_operator: [
        {
          id: "op_monitoring",
          title: t("onboarding.steps.oracle_operator.nodeMonitoring.title"),
          description: t(
            "onboarding.steps.oracle_operator.nodeMonitoring.description",
          ),
          icon: <BarChart2 className="w-10 h-10 text-blue-600" />,
        },
        {
          id: "op_sync",
          title: t("onboarding.steps.oracle_operator.syncStatus.title"),
          description: t(
            "onboarding.steps.oracle_operator.syncStatus.description",
          ),
          icon: <AlertCircle className="w-10 h-10 text-purple-600" />,
        },
        {
          id: "op_alerts",
          title: t("onboarding.steps.oracle_operator.alerts.title"),
          description: t("onboarding.steps.oracle_operator.alerts.description"),
          icon: <Users className="w-10 h-10 text-orange-600" />,
        },
      ],
      general_user: [
        {
          id: "user_monitoring",
          title: t("onboarding.steps.general_user.exploration.title"),
          description: t(
            "onboarding.steps.general_user.exploration.description",
          ),
          icon: <BarChart2 className="w-10 h-10 text-blue-600" />,
        },
        {
          id: "user_assertions",
          title: t("onboarding.steps.general_user.assertions.title"),
          description: t(
            "onboarding.steps.general_user.assertions.description",
          ),
          icon: <FileText className="w-10 h-10 text-green-600" />,
        },
        {
          id: "user_disputes",
          title: t("onboarding.steps.general_user.disputes.title"),
          description: t("onboarding.steps.general_user.disputes.description"),
          icon: <Users className="w-10 h-10 text-orange-600" />,
        },
      ],
    };

    return roleStepsConfig[selectedRole] || [];
  };

  const steps = getCurrentSteps();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setShowRoleSelection(false);
    setCurrentStep(0);
    localStorage.setItem("insight-user-role", role);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem("insight-onboarding-completed", "true");
    setIsOpen(false);
    onComplete?.();
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm",
        className,
      )}
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {t("onboarding.title")}
          </h2>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showRoleSelection ? (
            <RoleSelection
              onRoleSelect={handleRoleSelect}
              onSkip={handleSkip}
            />
          ) : (
            <OnboardingSteps
              currentStep={currentStep}
              steps={steps}
              onNext={handleNext}
              onSkip={handleSkip}
            />
          )}
        </div>
      </div>
    </div>
  );
}
