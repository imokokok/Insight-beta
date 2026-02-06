export const sla = {
  title: 'Monitoreo de SLA',
  description:
    'Monitoreo de cumplimiento del Acuerdo de Nivel de Servicio para protocolos de oráculos',
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
