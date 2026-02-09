export const protocol = {
  // Protocol Status
  status: {
    healthy: 'Saludable',
    degraded: 'Degradado',
    down: 'Caído',
    active: 'Activo',
    stale: 'Obsoleto',
    error: 'Error',
  },

  // Health Score
  health: {
    excellent: 'Excelente',
    excellentDesc:
      'El protocolo funciona excelentemente, todos los indicadores alcanzan niveles óptimos',
    good: 'Bueno',
    goodDesc: 'El protocolo funciona bien, la mayoría de los indicadores son normales',
    fair: 'Regular',
    fairDesc: 'El protocolo funciona regularmente, algunos indicadores necesitan atención',
    poor: 'Deficiente',
    poorDesc: 'El protocolo funciona deficientemente, se recomienda revisión inmediata',
  },

  // Metrics
  metrics: {
    latency: 'Latencia',
    accuracy: 'Precisión',
    uptime: 'Tiempo de Actividad',
    feeds: 'Feeds',
    avgUpdateTime: 'Tiempo Promedio de Actualización',
    priceDeviation: 'Desviación de Precio',
    availability: 'Disponibilidad',
    of: 'de',
  },

  // Asset Pairs
  assetPairs: 'Pares de Activos',
  pair: 'Par',
  price: 'Precio',
  deviation: 'Desviación',
  trend: 'Tendencia',
  lastUpdate: 'Última Actualización',
  pairStatus: {
    active: 'Activo',
    stale: 'Obsoleto',
    error: 'Error',
  },
  searchPairs: 'Buscar pares de activos...',
  noPairsFound: 'No se encontraron pares de activos',

  // Performance Chart
  performance: {
    title: 'Rendimiento Histórico',
    noData: 'No hay datos de rendimiento',
    accuracy: 'Precisión',
    latency: 'Latencia',
    uptime: 'Tiempo de Actividad',
    avgAccuracy: 'Precisión Promedio',
    avgLatency: 'Latencia Promedio',
    avgUptime: 'Tiempo de Actividad Promedio',
  },

  // Alerts
  alerts: {
    title: 'Centro de Alertas',
    all: 'Todas',
    unacknowledged: 'No Reconocidas',
    acknowledge: 'Reconocer',
    noAlerts: 'No hay alertas',
  },
  alertLevel: {
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Medio',
    low: 'Bajo',
    info: 'Info',
  },

  // Protocol Comparison
  comparison: {
    title: 'Comparación de Protocolos',
    best: 'Mejor',
    top: 'TOP',
    protocol: 'Protocolo',
    healthScore: 'Puntuación de Salud',
    latency: 'Latencia',
    accuracy: 'Precisión',
    uptime: 'Tiempo de Actividad',
    actions: 'Acciones',
    feeds: 'Feeds',
    chains: 'Cadenas',
    tvl: 'TVL',
    marketShare: 'Cuota de Mercado',
    features: 'Características',
  },

  // Node Distribution
  nodeDistribution: {
    title: 'Distribución de Nodos',
    totalNodes: 'Nodos Totales',
    healthy: 'Saludable',
    avgLatency: 'Latencia Promedio',
    healthyNodes: 'Nodos Saludables',
    health: 'Salud',
  },

  // Real-time Price Stream
  priceStream: {
    title: 'Flujo de Precios en Tiempo Real',
    updates: 'Actualizaciones',
    noUpdates: 'No hay actualizaciones de precios',
    avgChange: 'Cambio Promedio',
    up: 'Subida',
    down: 'Bajada',
  },

  // Data Freshness
  freshness: {
    fresh: 'Fresco',
    freshDesc: 'Los datos se actualizaron recientemente',
    warning: 'Advertencia',
    warningDesc: 'Los datos están algo obsoletos',
    stale: 'Obsoleto',
    staleDesc: 'Los datos han expirado',
    expired: 'Caducado',
    expiredDesc: 'Los datos han caducado',
  },

  // Arbitrage Opportunities
  arbitrage: {
    title: 'Oportunidades de Arbitraje',
    totalProfit: 'Ganancia Total',
    avgSpread: 'Spread Promedio',
    noOpportunities: 'No hay oportunidades de arbitraje',
    riskLow: 'Riesgo Bajo',
    riskMedium: 'Riesgo Medio',
    riskHigh: 'Riesgo Alto',
    buy: 'Comprar',
    sell: 'Vender',
    estimatedProfit: 'Ganancia Estimada',
    execute: 'Ejecutar',
    highRiskWarning:
      'Alto riesgo: la volatilidad de precios puede ser rápida, proceda con precaución',
  },

  // Risk Score
  risk: {
    title: 'Puntuación de Riesgo',
    low: 'Riesgo Bajo',
    lowDesc: 'El riesgo del protocolo es bajo, funcionamiento estable',
    medium: 'Riesgo Medio',
    mediumDesc: 'El protocolo tiene cierto riesgo, requiere atención',
    high: 'Riesgo Alto',
    highDesc: 'El riesgo del protocolo es alto, se recomienda usar con precaución',
    critical: 'Riesgo Crítico',
    criticalDesc: 'El protocolo tiene riesgo crítico, se recomienda revisión inmediata',
    noData: 'No hay datos de riesgo',
    lastAssessment: 'Última Evaluación',
    improving: 'Mejorando',
    stable: 'Estable',
    worsening: 'Empeorando',
    factors: 'Factores de Riesgo',
    lowRisk: 'Riesgo Bajo',
    highRisk: 'Riesgo Alto',
  },

  // General
  noData: 'No hay datos',
  visitWebsite: 'Visitar Sitio Web',
  activeFeeds: 'Feeds Activos',
  supportedChains: 'Cadenas Soportadas',
  marketShare: 'Cuota de Mercado',
  submitReview: 'Enviar Revisión',
  reviewNotes: 'Notas de Revisión',
};
