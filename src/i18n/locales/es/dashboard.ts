export const dashboard = {
  // Layout
  layout: {
    title: 'Panel de Control',
    subtitle: 'Monitoreo y análisis en tiempo real de datos de oráculos',
  },

  // Heatmap
  heatmap: {
    title: 'Mapa de Calor de Desviación de Precios',
    hot: 'Caliente',
    cold: 'Frío',
    avg: 'Desv. Promedio',
    legend: 'Desviación',
    stable: 'Estable',
    slight: 'Leve',
    moderate: 'Moderada',
    high: 'Alta',
    extreme: 'Extrema',
    price: 'Precio',
    deviation: 'Desviación',
  },

  // Chart
  chart: {
    spread: 'Spread',
    average: 'Promedio',
  },

  // Gauge
  gauge: {
    title: 'Indicador de Desviación',
    normal: 'Normal',
    normalDesc: 'El precio fluctúa dentro del rango normal',
    elevated: 'Elevado',
    elevatedDesc: 'La desviación de precios es ligeramente alta, se necesita atención',
    critical: 'Crítico',
    criticalDesc: 'Desviación severa de precios, se recomienda inspección inmediata',
    threshold: 'Umbral',
  },

  // Network Topology
  topology: {
    title: 'Topología de Red',
    online: 'En línea',
    degraded: 'Degradado',
    offline: 'Fuera de línea',
    dataSources: 'Fuentes de Datos',
    aggregators: 'Agregadores',
    oracles: 'Oráculos',
    latency: 'Latencia',
  },

  // Quick Actions
  actions: {
    title: 'Acciones Rápidas',
    refresh: 'Actualizar',
    export: 'Exportar',
    filter: 'Filtrar',
    settings: 'Configuración',
  },

  // KPI
  kpi: {
    tvl: 'Valor Total Bloqueado',
    activeProtocols: 'Protocolos Activos',
    dailyUpdates: 'Actualizaciones Diarias',
    activeUsers: 'Usuarios Activos',
  },
};
