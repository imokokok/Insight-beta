export const security = {
  title: 'Monitoreo de Seguridad',
  description: 'Monitoreo y detección en tiempo real de ataques de manipulación de oráculos',
  dashboard: {
    title: 'Panel de Seguridad',
    subtitle: 'Monitoreo en tiempo real del estado de seguridad del oráculo',
  },
  config: {
    title: 'Configuración de Detección de Manipulación de Precios',
    subtitle: 'Configurar reglas de detección, umbrales y ajustes de alerta',
    tabs: {
      rules: 'Reglas de Detección',
      thresholds: 'Umbrales',
      alerts: 'Configuración de Alertas',
      advanced: 'Avanzado',
    },
    sections: {
      enabledRules: 'Reglas de Detección Habilitadas',
      enabledRulesDesc:
        'Selecciona las reglas de detección de manipulación de precios para habilitar',
      statisticalThresholds: 'Umbrales de Anomalías Estadísticas',
      attackThresholds: 'Umbrales de Detección de Ataques',
      zScoreDesc:
        'Multiplicador de desviación estándar, valores por encima se consideran anómalos (recomendado: 3)',
      minDataPointsDesc:
        'Número mínimo de puntos de datos históricos requeridos para detección estadística',
      alertChannels: 'Canales de Alerta',
      alertChannelsDesc: 'Configurar métodos de notificación para alertas de detección',
    },
    labels: {
      zScoreThreshold: 'Umbral de Z-Score',
      minConfidence: 'Confianza Mínima',
      maxPriceDeviation: 'Desviación Máxima de Precio (%)',
      minDataPoints: 'Puntos de Datos Mínimos',
      flashLoanMinAmount: 'Monto Mínimo de Préstamo Flash (USD)',
      sandwichProfitThreshold: 'Umbral de Ganancia Sándwich (USD)',
      liquidityChangeThreshold: 'Umbral de Cambio de Liquidez',
    },
    enabled: 'Habilitado',
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
    webhook: {
      name: 'Webhook',
      description: 'Llamar URL de Webhook configurada',
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
  reviewNotes: 'Notas de Revisión',
  submitReview: 'Enviar Revisión',
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
    financialImpact: 'Impacto Financiero',
    suspiciousTx: 'Transacciones Sospechosas',
  },
};
