const onboarding = {
  title: 'Bienvenue sur OracleMonitor',
  description: "Solution complète de surveillance d'oracle pour plusieurs protocoles.",
  getStarted: 'Commencer',
  skipTour: 'Passer la visite',
  next: 'Suivant',
  back: 'Retour',
  complete: 'Terminer',
  cancel: 'Annuler',
  confirm: 'Confirmer',
  stepOf: 'Étape {{current}} sur {{total}}',
  welcome: 'Bienvenue sur OracleMonitor',
  welcomeDesc: "Votre plateforme universelle de surveillance d'oracle",
  selectRole: 'Sélectionnez votre rôle pour commencer',
  continueAsGeneral: "Continuer en tant qu'utilisateur général",
  viewAgain: 'Voir la visite à nouveau',
  resetConfirm: "Êtes-vous sûr de vouloir revoir l'intégration ? Cela actualisera la page.",
  targetNotFound: 'Élément cible non trouvé',
  steps: {
    developer: {
      api: {
        title: 'Intégration API',
        description:
          'Apprenez à intégrer notre API oracle pour obtenir des données de prix en temps réel',
      },
      integration: {
        title: 'Intégration rapide',
        description: 'Utilisez notre SDK pour intégrer des données oracle en quelques minutes',
      },
      monitoring: {
        title: 'Surveillance en temps réel',
        description: "Suivez les performances de l'oracle et la qualité des données en temps réel",
      },
    },
    protocol: {
      monitoring: {
        title: "Surveillance de l'oracle",
        description:
          "Surveillez la santé de l'oracle, l'état des nœuds et les métriques de performance",
      },
      disputes: {
        title: 'Gestion des litiges',
        description: "Gérez efficacement les litiges d'oracle et la validation des assertions",
      },
      alerts: {
        title: 'Alertes intelligentes',
        description: 'Configurez des alertes personnalisées pour être informé des anomalies',
      },
    },
    general: {
      exploration: {
        title: 'Exploration des données',
        description: 'Explorez les données oracle cross-protocole et les tendances de prix',
      },
      comparison: {
        title: 'Comparaison des protocoles',
        description: 'Comparez les prix et les performances entre différents protocoles oracle',
      },
      alerts: {
        title: 'Alertes de prix',
        description:
          'Définissez des alertes de déviation de prix pour suivre les mouvements du marché',
      },
    },
  },
  roles: {
    developer: {
      title: 'Développeur',
      description: 'Construire des applications utilisant des données oracle',
    },
    protocol: {
      title: 'Équipe protocole',
      description: "Gérer l'intégration oracle et les opérations de nœuds",
    },
    general: {
      title: 'Utilisateur général',
      description: 'Surveiller et analyser les données oracle',
    },
  },
  tour: {
    dashboard: {
      title: "Vue d'ensemble du tableau de bord",
      description: 'Consultez toutes les métriques clés et les données en temps réel ici.',
    },
    protocols: {
      title: 'Sélection du protocole',
      description: 'Cliquez ici pour basculer entre différents protocoles oracle.',
    },
    search: {
      title: 'Fonction de recherche',
      description:
        "Utilisez la recherche pour trouver rapidement l'oracle ou l'actif dont vous avez besoin.",
    },
    alerts: {
      title: "Centre d'alertes",
      description: "Consultez et gérez toutes vos notifications d'alerte.",
    },
    settings: {
      title: 'Paramètres',
      description:
        'Personnalisez vos préférences de surveillance et les paramètres de notification.',
    },
  },
};

export default onboarding;
