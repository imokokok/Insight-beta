export const dashboard = {
  // Layout
  layout: {
    title: 'Tableau de Bord',
    subtitle: "Surveillance et analyse en temps réel des données d'oracle",
  },

  // Heatmap
  heatmap: {
    title: 'Carte Thermique de Déviation de Prix',
    hot: 'Chaud',
    cold: 'Froid',
    avg: 'Dév. Moyenne',
    legend: 'Déviation',
    stable: 'Stable',
    slight: 'Légère',
    moderate: 'Modérée',
    high: 'Élevée',
    extreme: 'Extrême',
    price: 'Prix',
    deviation: 'Déviation',
  },

  // Chart
  chart: {
    spread: 'Spread',
    average: 'Moyenne',
  },

  // Gauge
  gauge: {
    title: 'Jauge de Déviation',
    normal: 'Normal',
    normalDesc: 'Le prix fluctue dans la plage normale',
    elevated: 'Élevé',
    elevatedDesc: 'La déviation de prix est légèrement élevée, attention requise',
    critical: 'Critique',
    criticalDesc: 'Déviation sévère des prix, inspection immédiate recommandée',
    threshold: 'Seuil',
  },

  // Network Topology
  topology: {
    title: 'Topologie de Réseau',
    online: 'En ligne',
    degraded: 'Dégradé',
    offline: 'Hors ligne',
    dataSources: 'Sources de Données',
    aggregators: 'Agrégateurs',
    oracles: 'Oracles',
    latency: 'Latence',
  },

  // Quick Actions
  actions: {
    title: 'Actions Rapides',
    refresh: 'Actualiser',
    export: 'Exporter',
    filter: 'Filtrer',
    settings: 'Paramètres',
  },

  // KPI
  kpi: {
    tvl: 'Valeur Totale Verrouillée',
    activeProtocols: 'Protocoles Actifs',
    dailyUpdates: 'Mises à Jour Quotidiennes',
    activeUsers: 'Utilisateurs Actifs',
  },
};
