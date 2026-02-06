import { FileText, BarChart2, AlertCircle, Users } from 'lucide-react';

import { useI18n } from '@/i18n/LanguageProvider';

import type { UserRole } from '../Onboarding';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
  onSkip: () => void;
}

export function RoleSelection({ onRoleSelect, onSkip }: RoleSelectionProps) {
  const { t } = useI18n();
  const roles = [
    {
      role: 'developer' as UserRole,
      title: t('onboarding.roles.developer.title'),
      description: t('onboarding.roles.developer.description'),
      icon: <FileText className="h-6 w-6 text-blue-600" />,
    },
    {
      role: 'protocol_team' as UserRole,
      title: t('onboarding.roles.protocol_team.title'),
      description: t('onboarding.roles.protocol_team.description'),
      icon: <BarChart2 className="h-6 w-6 text-green-600" />,
    },
    {
      role: 'oracle_operator' as UserRole,
      title: t('onboarding.roles.oracle_operator.title'),
      description: t('onboarding.roles.oracle_operator.description'),
      icon: <AlertCircle className="h-6 w-6 text-purple-600" />,
    },
    {
      role: 'general_user' as UserRole,
      title: t('onboarding.roles.general_user.title'),
      description: t('onboarding.roles.general_user.description'),
      icon: <Users className="h-6 w-6 text-orange-600" />,
    },
  ];

  return (
    <>
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4">
          <AlertCircle className="h-10 w-10 text-purple-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{t('onboarding.welcome')}</h3>
        <p className="mb-4 text-gray-600">{t('onboarding.welcomeDesc')}</p>
        <p className="mb-6 text-sm text-gray-500">{t('onboarding.selectRole')}</p>
      </div>

      {/* Role Cards */}
      <div className="mb-6 grid grid-cols-1 gap-3">
        {roles.map((roleOption) => (
          <button
            key={roleOption.role}
            onClick={() => onRoleSelect(roleOption.role)}
            className="flex items-start rounded-lg border border-gray-200 p-4 text-left transition-colors hover:bg-purple-50"
          >
            <div className="mr-3">{roleOption.icon}</div>
            <div>
              <h4 className="font-medium text-gray-900">{roleOption.title}</h4>
              <p className="mt-1 text-sm text-gray-600">{roleOption.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
        >
          {t('onboarding.skipTour')}
        </button>
        <button
          onClick={() => onRoleSelect('general_user')}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
        >
          {t('onboarding.continueAsGeneral')}
        </button>
      </div>
    </>
  );
}
