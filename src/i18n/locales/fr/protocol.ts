export const protocol = {
  // Protocol Status
  status: {
    healthy: 'Sain',
    degraded: 'Dégradé',
    down: 'Hors Ligne',
    active: 'Actif',
    stale: 'Périmé',
    error: 'Erreur',
  },

  // Health Score
  health: {
    excellent: 'Excellent',
    excellentDesc:
      'Le protocole fonctionne parfaitement, tous les indicateurs atteignent des niveaux optimaux',
    good: 'Bon',
    goodDesc: 'Le protocole fonctionne bien, la plupart des indicateurs sont normaux',
    fair: 'Moyen',
    fairDesc: 'Le protocole fonctionne moyennement, certains indicateurs nécessitent attention',
    poor: 'Faible',
    poorDesc: 'Le protocole fonctionne faiblement, révision immédiate recommandée',
  },

  // Metrics
  metrics: {
    latency: 'Latence',
    accuracy: 'Précision',
    uptime: 'Temps de Fonctionnement',
    feeds: 'Flux',
    avgUpdateTime: 'Temps Moyen de Mise à Jour',
    priceDeviation: 'Déviation de Prix',
    availability: 'Disponibilité',
    of: 'sur',
  },

  // Asset Pairs
  assetPairs: "Paires d'Actifs",
  pair: 'Paire',
  price: 'Prix',
  deviation: 'Déviation',
  trend: 'Tendance',
  lastUpdate: 'Dernière Mise à Jour',
  pairStatus: {
    active: 'Actif',
    stale: 'Périmé',
    error: 'Erreur',
  },
  searchPairs: "Rechercher des paires d'actifs...",
  noPairsFound: "Aucune paire d'actifs trouvée",

  // Performance Chart
  performance: {
    title: 'Performance Historique',
    noData: 'Aucune donnée de performance',
    accuracy: 'Précision',
    latency: 'Latence',
    uptime: 'Temps de Fonctionnement',
    avgAccuracy: 'Précision Moyenne',
    avgLatency: 'Latence Moyenne',
    avgUptime: 'Temps de Fonctionnement Moyen',
  },

  // Alerts
  alerts: {
    title: "Centre d'Alertes",
    all: 'Toutes',
    unacknowledged: 'Non Reconnues',
    acknowledge: 'Reconnaître',
    noAlerts: 'Aucune alerte',
  },
  alertLevel: {
    critical: 'Critique',
    high: 'Élevé',
    medium: 'Moyen',
    low: 'Faible',
    info: 'Info',
  },

  // Protocol Comparison
  comparison: {
    title: 'Comparaison de Protocoles',
    best: 'Meilleur',
    top: 'TOP',
    protocol: 'Protocole',
    healthScore: 'Score de Santé',
    latency: 'Latence',
    accuracy: 'Précision',
    uptime: 'Temps de Fonctionnement',
    actions: 'Actions',
    feeds: 'Flux',
    chains: 'Chaînes',
    tvl: 'TVL',
    marketShare: 'Part de Marché',
    features: 'Caractéristiques',
  },

  // Node Distribution
  nodeDistribution: {
    title: 'Distribution des Nœuds',
    totalNodes: 'Nœuds Totaux',
    healthy: 'Sain',
    avgLatency: 'Latence Moyenne',
    healthyNodes: 'Nœuds Sains',
    health: 'Santé',
  },

  // Real-time Price Stream
  priceStream: {
    title: 'Flux de Prix en Temps Réel',
    updates: 'Mises à Jour',
    noUpdates: 'Aucune mise à jour de prix',
    avgChange: 'Changement Moyen',
    up: 'Hausse',
    down: 'Baisse',
  },

  // Data Freshness
  freshness: {
    fresh: 'Frais',
    freshDesc: "Les données viennent d'être mises à jour",
    warning: 'Avertissement',
    warningDesc: 'Les données sont quelque peu périmées',
    stale: 'Périmé',
    staleDesc: 'Les données ont expiré',
    expired: 'Expiré',
    expiredDesc: 'Les données ont expiré',
  },

  // Arbitrage Opportunities
  arbitrage: {
    title: "Opportunités d'Arbitrage",
    totalProfit: 'Profit Total',
    avgSpread: 'Spread Moyen',
    noOpportunities: "Aucune opportunité d'arbitrage",
    riskLow: 'Risque Faible',
    riskMedium: 'Risque Moyen',
    riskHigh: 'Risque Élevé',
    buy: 'Acheter',
    sell: 'Vendre',
    estimatedProfit: 'Profit Estimé',
    execute: 'Exécuter',
    highRiskWarning:
      'Risque élevé: la volatilité des prix peut être rapide, procédez avec prudence',
  },

  // Risk Score
  risk: {
    title: 'Score de Risque',
    low: 'Risque Faible',
    lowDesc: 'Le risque du protocole est faible, fonctionnement stable',
    medium: 'Risque Moyen',
    mediumDesc: 'Le protocole présente un certain risque, nécessite attention',
    high: 'Risque Élevé',
    highDesc: 'Le risque du protocole est élevé, utilisation prudente recommandée',
    critical: 'Risque Critique',
    criticalDesc: 'Le protocole présente un risque critique, révision immédiate recommandée',
    noData: 'Aucune donnée de risque',
    lastAssessment: 'Dernière Évaluation',
    improving: 'En Amélioration',
    stable: 'Stable',
    worsening: 'En Détérioration',
    factors: 'Facteurs de Risque',
    lowRisk: 'Risque Faible',
    highRisk: 'Risque Élevé',
  },

  // General
  noData: 'Aucune donnée',
  visitWebsite: 'Visiter le Site Web',
  activeFeeds: 'Flux Actifs',
  supportedChains: 'Chaînes Supportées',
  marketShare: 'Part de Marché',
  submitReview: 'Soumettre une Révision',
  reviewNotes: 'Notes de Révision',
};
