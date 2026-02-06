export const sla = {
  title: 'Surveillance du SLA',
  description:
    "Surveillance de la conformité de l'Accord de Niveau de Service pour les protocoles d'oracles",
  stats: {
    overallCompliance: 'Conformité Globale',
    compliantProtocols: 'Protocoles Conformes',
    totalProtocols: 'Total {{count}} protocoles',
    atRiskProtocols: 'Protocoles à Risque',
    needsAttention: 'Nécessite attention',
    breachedProtocols: 'Protocoles Violés',
    slaBreached: 'SLA violé',
  },
  status: {
    compliant: 'Conforme',
    at_risk: 'À Risque',
    breached: 'Violé',
  },
  metrics: {
    uptime: 'Temps de Fonctionnement',
    avgLatency: 'Latence Moyenne',
    accuracy: 'Précision',
    availability: 'Disponibilité',
  },
};
