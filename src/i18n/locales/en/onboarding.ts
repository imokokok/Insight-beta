const onboarding = {
  title: 'Welcome to OracleMonitor',
  description: 'Comprehensive oracle monitoring solution for multiple protocols.',
  getStarted: 'Get Started',
  skipTour: 'Skip Tour',
  next: 'Next',
  back: 'Back',
  complete: 'Complete',
  cancel: 'Cancel',
  confirm: 'Confirm',
  stepOf: 'Step {{current}} of {{total}}',
  welcome: 'Welcome to OracleMonitor',
  welcomeDesc: 'Your universal oracle monitoring platform',
  selectRole: 'Select your role to get started',
  continueAsGeneral: 'Continue as General User',
  viewAgain: 'View Tour Again',
  resetConfirm: 'Are you sure you want to view the onboarding again? This will refresh the page.',
  targetNotFound: 'Target element not found',
  guidedTour: {
    title: 'Guided Tour',
    description: 'Let\'s take a 1-2 minute tour to learn the main features',
    startTour: 'Start Tour',
    skipForNow: 'Skip for Now',
    finish: 'Finish Tour',
    progress: '{{current}}/{{total}}',
  },
  steps: {
    developer: {
      api: {
        title: 'API Integration',
        description: 'Learn how to integrate our oracle API to get real-time price data',
      },
      integration: {
        title: 'Quick Integration',
        description: 'Use our SDK to integrate oracle data in minutes',
      },
      monitoring: {
        title: 'Real-time Monitoring',
        description: 'Track oracle performance and data quality in real-time',
      },
    },
    protocol: {
      monitoring: {
        title: 'Oracle Monitoring',
        description: 'Monitor oracle health, node status, and performance metrics',
      },
      disputes: {
        title: 'Dispute Management',
        description: 'Efficiently handle oracle disputes and assertion validation',
      },
      alerts: {
        title: 'Smart Alerts',
        description: 'Set up custom alerts to get notified of anomalies',
      },
    },
    general: {
      exploration: {
        title: 'Data Exploration',
        description: 'Explore cross-protocol oracle data and price trends',
      },
      comparison: {
        title: 'Protocol Comparison',
        description: 'Compare prices and performance across different oracle protocols',
      },
      alerts: {
        title: 'Price Alerts',
        description: 'Set price deviation alerts to stay on top of market movements',
      },
    },
  },
  roles: {
    developer: {
      title: 'Developer',
      description: 'Build applications using oracle data',
    },
    protocol: {
      title: 'Protocol Team',
      description: 'Manage oracle integration and node operations',
    },
    general: {
      title: 'General User',
      description: 'Monitor and analyze oracle data',
    },
  },
  tour: {
    dashboard: {
      title: 'Dashboard',
      description: 'Your central command center showing all key metrics and system health in real-time.',
    },
    alerts: {
      title: 'Alerts',
      description: 'View and manage all system alerts, including price deviations, node offline notifications, and more.',
    },
    protocols: {
      title: 'Protocols',
      description: 'Monitor multiple oracle protocols like Chainlink, Pyth, Band with real-time data and performance metrics.',
    },
    watchlist: {
      title: 'Watchlist',
      description: 'Add assets you care about to quickly track important price changes.',
    },
    sidebar: {
      title: 'Navigation',
      description: 'Use the sidebar to quickly access different functional modules.',
    },
    settings: {
      title: 'Settings',
      description: 'Customize your monitoring preferences and notification settings.',
    },
  },
  emptyStates: {
    alerts: {
      title: 'System Healthy',
      description: 'No active alerts at the moment. All oracle protocols are running normally.',
      action: 'Set Alert Rules',
      actionDesc: 'Configure custom alert thresholds to get notified of anomalies',
    },
    watchlist: {
      title: 'Start Adding Monitors',
      description: 'You haven\'t added any monitors yet. Start building your watchlist.',
      action: 'Add First Monitor',
      actionDesc: 'Browse oracle data and add assets you\'re interested in',
    },
  },
};

export default onboarding;
