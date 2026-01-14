"use client";

import React, { useState, useEffect } from "react";
import { X, AlertCircle, BarChart2, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";
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

const roleSpecificSteps = [
  {
    role: "developer" as UserRole,
    steps: [
      {
        id: "dev_api",
        title: "API Access",
        description:
          "Explore our REST API for accessing Oracle data programmatically.",
        icon: <FileText className="w-10 h-10 text-blue-600" />,
      },
      {
        id: "dev_integration",
        title: "Easy Integration",
        description: "Integrate Oracle data into your dApps with simple SDKs.",
        icon: <BarChart2 className="w-10 h-10 text-green-600" />,
      },
      {
        id: "dev_monitoring",
        title: "Monitor Your Integrations",
        description:
          "Track the performance of Oracle data in your applications.",
        icon: <AlertCircle className="w-10 h-10 text-purple-600" />,
      },
    ],
  },
  {
    role: "protocol_team" as UserRole,
    steps: [
      {
        id: "proto_monitoring",
        title: "Real-time Monitoring",
        description:
          "Monitor Oracle data trends and sync status for your protocols.",
        icon: <BarChart2 className="w-10 h-10 text-blue-600" />,
      },
      {
        id: "proto_disputes",
        title: "Dispute Resolution",
        description: "Participate in disputes and ensure fair outcomes.",
        icon: <Users className="w-10 h-10 text-orange-600" />,
      },
      {
        id: "proto_analytics",
        title: "Performance Analytics",
        description: "Analyze Oracle performance across different markets.",
        icon: <FileText className="w-10 h-10 text-green-600" />,
      },
    ],
  },
  {
    role: "oracle_operator" as UserRole,
    steps: [
      {
        id: "op_monitoring",
        title: "Node Monitoring",
        description: "Monitor the performance and status of your Oracle nodes.",
        icon: <BarChart2 className="w-10 h-10 text-blue-600" />,
      },
      {
        id: "op_sync",
        title: "Sync Status",
        description: "Track sync status and latency across chains.",
        icon: <AlertCircle className="w-10 h-10 text-purple-600" />,
      },
      {
        id: "op_alerts",
        title: "Alert Management",
        description: "Configure alerts for important events and anomalies.",
        icon: <Users className="w-10 h-10 text-orange-600" />,
      },
    ],
  },
  {
    role: "general_user" as UserRole,
    steps: [
      {
        id: "user_monitoring",
        title: "Data Exploration",
        description:
          "Browse Oracle data across different markets and protocols.",
        icon: <BarChart2 className="w-10 h-10 text-blue-600" />,
      },
      {
        id: "user_assertions",
        title: "Assertion Creation",
        description: "Create and track assertions on Oracle data.",
        icon: <FileText className="w-10 h-10 text-green-600" />,
      },
      {
        id: "user_disputes",
        title: "Dispute Participation",
        description: "Vote on disputes and shape the outcome.",
        icon: <Users className="w-10 h-10 text-orange-600" />,
      },
    ],
  },
];

export function Onboarding({ onComplete, className }: OnboardingProps) {
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
    title: "Welcome to Insight",
    description:
      "Insight is your gateway to Oracle monitoring and dispute resolution. Let's take a quick tour to get you started.",
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
    const roleSteps = roleSpecificSteps.find((r) => r.role === selectedRole);
    return roleSteps ? roleSteps.steps : [];
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
        className
      )}
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Insight Quick Tour
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
