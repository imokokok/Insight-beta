import { motion } from 'framer-motion';
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
      role: 'protocol' as UserRole,
      title: t('onboarding.roles.protocol.title'),
      description: t('onboarding.roles.protocol.description'),
      icon: <BarChart2 className="h-6 w-6 text-green-600" />,
    },
    {
      role: 'general' as UserRole,
      title: t('onboarding.roles.general.title'),
      description: t('onboarding.roles.general.description'),
      icon: <Users className="h-6 w-6 text-amber-600" />,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <div className="mb-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <AlertCircle className="h-10 w-10 text-purple-600" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-2 text-lg font-semibold text-gray-900"
        >
          {t('onboarding.welcome')}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mb-4 text-gray-600"
        >
          {t('onboarding.welcomeDesc')}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mb-6 text-sm text-gray-500"
        >
          {t('onboarding.selectRole')}
        </motion.p>
      </div>

      {/* Role Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-6 grid grid-cols-1 gap-3"
      >
        {roles.map((roleOption) => (
          <motion.button
            key={roleOption.role}
            variants={itemVariants}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onRoleSelect(roleOption.role)}
            className="flex items-start rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-purple-300 hover:bg-purple-50 sm:p-4"
          >
            <div className="mr-3 flex-shrink-0">{roleOption.icon}</div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-gray-900">{roleOption.title}</h4>
              <p className="mt-1 text-sm text-gray-600">{roleOption.description}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="flex flex-col gap-2 sm:flex-row sm:gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSkip}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
        >
          {t('onboarding.skipTour')}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onRoleSelect('general')}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
        >
          {t('onboarding.continueAsGeneral')}
        </motion.button>
      </motion.div>
    </>
  );
}
