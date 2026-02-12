export const alerts = {
  acknowledge: 'Acusar Recibo',
  adminActor: 'Actor',
  adminActorPlaceholder: 'ej. alice@ops',
  adminToken: 'Token de administrador',
  adminTokenHint: 'Almacenado localmente en esta sesión para acceso a API de administrador',
  adminTokenWarning:
    'Sin un token solo puedes ver alertas, no acusar recibo/resolver o guardar reglas.',
  description: 'Agrega alertas, acusa recibo y rastrea la salud.',
  explanation: 'Explicación',
  filter: 'Filtrar',
  lastSeen: 'Último',
  loadRules: 'Cargar Reglas',
  occurrences: 'Ocurrencias',
  owner: 'Propietario',
  recommendedActions: 'Acciones recomendadas',
  refresh: 'Actualizar',
  resolve: 'Resolver',
  rules: 'Reglas de alerta',
  runbook: 'Manual',
  saveRules: 'Guardar',
  savingRules: 'Guardando…',
  searchPlaceholder: 'Buscar título/contenido/entidad…',
  severity: 'Severidad',
  silence24h: 'Silenciar 24h',
  silence2h: 'Silenciar 2h',
  silence30m: 'Silenciar 30m',
  silencedUntil: 'Silenciado hasta',
  status: 'Estado',
  title: 'Alertas',
  type: 'Tipo',
  unsilence: 'Desactivar silencio',

  // Configuración de Canales de Notificación
  config: {
    title: 'Configuración de Canales de Notificación',
    description:
      'Configura Webhook, PagerDuty, Slack, Email y otros canales de notificación de alertas',
    save: 'Guardar Configuración',
    saveSuccess: 'Configuración Guardada',
    saveSuccessDesc: 'La configuración de canales de notificación se ha actualizado correctamente',
    saveError: 'Error al Guardar',
    test: 'Probar',
    testSuccess: 'Prueba Exitosa',
    testError: 'Prueba Fallida',
    // Email
    smtpHost: 'Servidor SMTP',
    smtpPort: 'Puerto SMTP',
    username: 'Nombre de usuario',
    password: 'Contraseña',
    fromAddress: 'Dirección de remitente',
    toAddresses: 'Direcciones de destinatario (separadas por coma)',
    useTLS: 'Usar cifrado TLS',
    // Webhook
    webhookUrl: 'URL de Webhook',
    method: 'Método',
    headers: 'Encabezados (formato JSON)',
    timeoutMs: 'Tiempo de espera (ms)',
    retryCount: 'Número de reintentos',
    // Slack
    slackWebhookUrl: 'URL de Webhook de Slack',
    channel: 'Canal',
    // Telegram
    botToken: 'Bot Token',
    chatIds: 'Chat IDs (separados por coma)',
    parseMode: 'Modo de parseo',
    // PagerDuty
    integrationKey: 'Integration Key',
  },

  // Historial de Alertas
  history: {
    title: 'Historial de Alertas',
    description: 'Ver y gestionar registros de historial de alertas',
    noAlerts: 'No hay registros de alertas',
    acknowledge: 'Acusar recibo',
    acknowledged: 'Acusado',
    acknowledgeSuccess: 'Alerta Acusada',
    acknowledgeSuccessDesc: 'La alerta se ha acusado correctamente',
    acknowledgeError: 'Error al Acusar',
    acknowledgedBy: 'Acusado Por',
    acknowledgedAt: 'Acusado En',
    channelResults: 'Resultados de Entrega por Canal',
    success: 'Éxito',
    failed: 'Fallido',
    protocol: 'Protocolo',
    chain: 'Cadena',
    symbol: 'Símbolo',
  },

  // Estadísticas
  stats: {
    total: 'Total',
    pending: 'Pendiente',
    acknowledged: 'Acusado',
    critical: 'Crítico',
  },

  // Salud del Canal
  channelHealth: {
    title: 'Estado de Salud del Canal',
  },

  // Filtros
  filters: {
    severity: 'Severidad',
    all: 'Todos',
    protocol: 'Protocolo',
    protocolPlaceholder: 'Ingrese nombre de protocolo',
    symbol: 'Símbolo',
    symbolPlaceholder: 'Ingrese símbolo',
  },

  // Etiquetas de Severidad
  severityLabels: {
    critical: 'Crítico',
    warning: 'Advertencia',
    info: 'Información',
  },
};
