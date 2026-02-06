export const security = {
  title: 'Surveillance de Sécurité',
  description: 'Surveillance et détection en temps réel des attaques de manipulation des oracles',
  dashboard: {
    title: 'Tableau de Bord de Sécurité',
    subtitle: "Surveillance en temps réel de l'état de sécurité de l'oracle",
  },
  severity: {
    critical: 'Critique',
    high: 'Élevé',
    medium: 'Moyen',
    low: 'Faible',
  },
  attackTypes: {
    flash_loan_attack: 'Attaque par Prêt Flash',
    price_manipulation: 'Manipulation des Prix',
    oracle_manipulation: "Manipulation de l'Oracle",
    sandwich_attack: 'Attaque Sandwich',
    front_running: 'Front Running',
    back_running: 'Back Running',
    liquidity_manipulation: 'Manipulation de Liquidité',
    statistical_anomaly: 'Anomalie Statistique',
  },
  status: {
    pending: 'En Attente de Révision',
    confirmed: 'Confirmé',
    false_positive: 'Faux Positif',
    under_investigation: "En Cours d'Investigation",
    unknown: 'Inconnu',
  },
  detectionRules: {
    statistical_anomaly: {
      name: "Détection d'Anomalies Statistiques",
      description: "Détection d'anomalies basée sur le Z-score",
    },
    flash_loan: {
      name: "Détection d'Attaques par Prêt Flash",
      description: "Détecter les patterns d'attaque par prêt flash",
    },
    sandwich: {
      name: "Détection d'Attaques Sandwich",
      description: "Détecter les patterns d'attaque sandwich",
    },
    liquidity: {
      name: 'Détection de Manipulation de Liquidité',
      description: 'Détecter les changements anormaux de liquidité',
    },
    oracle: {
      name: "Détection de Manipulation d'Oracle",
      description: "Détecter la manipulation des prix de l'oracle",
    },
    front_running: {
      name: 'Détection de Front Running',
      description: 'Détecter le MEV front running',
    },
    back_running: {
      name: 'Détection de Back Running',
      description: 'Détecter le MEV back running',
    },
  },
  alertChannels: {
    email: {
      name: 'Alerte par Email',
      description: "Envoyer un email à l'adresse administrateur configurée",
    },
    slack: {
      name: 'Slack',
      description: 'Envoyer au canal Slack',
    },
    telegram: {
      name: 'Telegram',
      description: 'Envoyer un message Telegram',
    },
  },
  placeholders: {
    reviewNote: 'Entrez les notes de révision...',
  },
  notifications: {
    title: 'Alerte de Sécurité',
    newThreatDetected: 'Nouvelle menace détectée',
    investigationRequired: 'Investigation requise',
  },
  export: {
    detectionTime: 'Temps de Détection',
    protocol: 'Protocole',
    tradingPair: 'Paire de Trading',
    attackType: "Type d'Attaque",
    severity: 'Sévérité',
    status: 'Statut',
    confidence: 'Confiance',
    description: 'Description',
  },
};
