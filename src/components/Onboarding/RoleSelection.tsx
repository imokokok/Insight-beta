import React from "react";
import { FileText, BarChart2, AlertCircle, Users } from "lucide-react";
import { UserRole } from "../Onboarding";

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
  onSkip: () => void;
}

export function RoleSelection({ onRoleSelect, onSkip }: RoleSelectionProps) {
  const roles = [
    {
      role: "developer" as UserRole,
      title: "For Developers",
      description: "Build with confidence using our Oracle data API",
      icon: <FileText className="w-6 h-6 text-blue-600" />,
    },
    {
      role: "protocol_team" as UserRole,
      title: "For Protocol Teams",
      description: "Ensure Oracle data reliability for your DeFi protocols",
      icon: <BarChart2 className="w-6 h-6 text-green-600" />,
    },
    {
      role: "oracle_operator" as UserRole,
      title: "For Oracle Operators",
      description: "Manage your Oracle nodes and performance",
      icon: <AlertCircle className="w-6 h-6 text-purple-600" />,
    },
    {
      role: "general_user" as UserRole,
      title: "For General Users",
      description: "Explore Oracle data and participate in the ecosystem",
      icon: <Users className="w-6 h-6 text-orange-600" />,
    },
  ];

  return (
    <>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="mb-4">
          <AlertCircle className="w-10 h-10 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Welcome to Insight
        </h3>
        <p className="text-gray-600 mb-4">
          Insight is your gateway to Oracle monitoring and dispute resolution.
          Let&apos;s take a quick tour to get you started.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Please select your role to get a personalized tour:
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {roles.map((roleOption) => (
          <button
            key={roleOption.role}
            onClick={() => onRoleSelect(roleOption.role)}
            className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-purple-50 transition-colors text-left"
          >
            <div className="mr-3">{roleOption.icon}</div>
            <div>
              <h4 className="font-medium text-gray-900">{roleOption.title}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {roleOption.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Skip Tour
        </button>
        <button
          onClick={() => onRoleSelect("general_user")}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          Continue as General User
        </button>
      </div>
    </>
  );
}
