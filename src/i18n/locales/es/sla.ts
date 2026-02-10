export const sla = {
  title: 'Panel de Monitoreo de SLA',
  description:
    'Monitoreo de cumplimiento del Acuerdo de Nivel de Servicio para protocolos de oráculos',
  subtitle: 'Monitoreo del Acuerdo de Nivel de Servicio',
  refresh: 'Actualizar',
  reports: {
    title: 'Informes de SLA de Protocolos',
    noData: 'No hay datos de SLA disponibles',
  },
  targets: {
    uptime: '99.9%',
    latency: '<500ms',
    accuracy: '99.5%',
    availability: '99.9%',
  },
  labels: {
    slaCompliance: 'Cumplimiento de SLA',
  },
  stats: {
    overallCompliance: 'Cumplimiento General',
    compliantProtocols: 'Protocolos Cumplidos',
    totalProtocols: 'Total {{count}} protocolos',
    atRiskProtocols: 'Protocolos en Riesgo',
    needsAttention: 'Necesita atención',
    breachedProtocols: 'Protocolos Incumplidos',
    slaBreached: 'SLA incumplido',
  },
  status: {
    compliant: 'Cumplido',
    at_risk: 'En Riesgo',
    breached: 'Incumplido',
  },
  metrics: {
    uptime: 'Tiempo de Actividad',
    avgLatency: 'Latencia Promedio',
    accuracy: 'Precisión',
    availability: 'Disponibilidad',
  },
};
