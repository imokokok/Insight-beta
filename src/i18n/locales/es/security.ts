export const security = {
  title: 'Monitoreo de Seguridad',
  description: 'Monitoreo y detección en tiempo real de ataques de manipulación de oráculos',
  dashboard: {
    title: 'Panel de Seguridad',
    subtitle: 'Monitoreo en tiempo real del estado de seguridad del oráculo',
  },
  severity: {
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Medio',
    low: 'Bajo',
  },
  attackTypes: {
    flash_loan_attack: 'Ataque de Préstamo Flash',
    price_manipulation: 'Manipulación de Precios',
    oracle_manipulation: 'Manipulación de Oráculo',
    sandwich_attack: 'Ataque Sándwich',
    front_running: 'Front Running',
    back_running: 'Back Running',
    liquidity_manipulation: 'Manipulación de Liquidez',
    statistical_anomaly: 'Anomalía Estadística',
  },
  status: {
    pending: 'Pendiente de Revisión',
    confirmed: 'Confirmado',
    false_positive: 'Falso Positivo',
    under_investigation: 'En Investigación',
    unknown: 'Desconocido',
  },
  detectionRules: {
    statistical_anomaly: {
      name: 'Detección de Anomalías Estadísticas',
      description: 'Detección de anomalías basada en Z-score',
    },
    flash_loan: {
      name: 'Detección de Ataques de Préstamo Flash',
      description: 'Detectar patrones de ataque de préstamo flash',
    },
    sandwich: {
      name: 'Detección de Ataques Sándwich',
      description: 'Detectar patrones de ataque sándwich',
    },
    liquidity: {
      name: 'Detección de Manipulación de Liquidez',
      description: 'Detectar cambios anormales de liquidez',
    },
    oracle: {
      name: 'Detección de Manipulación de Oráculo',
      description: 'Detectar manipulación de precios del oráculo',
    },
    front_running: {
      name: 'Detección de Front Running',
      description: 'Detectar MEV front running',
    },
    back_running: {
      name: 'Detección de Back Running',
      description: 'Detectar MEV back running',
    },
  },
  alertChannels: {
    email: {
      name: 'Alerta por Correo',
      description: 'Enviar correo a la dirección de administrador configurada',
    },
    slack: {
      name: 'Slack',
      description: 'Enviar al canal de Slack',
    },
    telegram: {
      name: 'Telegram',
      description: 'Enviar mensaje de Telegram',
    },
  },
  placeholders: {
    reviewNote: 'Ingrese notas de revisión...',
  },
  notifications: {
    title: 'Alerta de Seguridad',
    newThreatDetected: 'Nueva amenaza detectada',
    investigationRequired: 'Investigación requerida',
  },
  export: {
    detectionTime: 'Tiempo de Detección',
    protocol: 'Protocolo',
    tradingPair: 'Par de Trading',
    attackType: 'Tipo de Ataque',
    severity: 'Severidad',
    status: 'Estado',
    confidence: 'Confianza',
    description: 'Descripción',
  },
};
