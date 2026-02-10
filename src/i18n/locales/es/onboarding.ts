const onboarding = {
  title: 'Bienvenido a OracleMonitor',
  description: 'Solución integral de monitoreo de oracle para múltiples protocolos.',
  getStarted: 'Comenzar',
  skipTour: 'Omitir recorrido',
  next: 'Siguiente',
  back: 'Atrás',
  complete: 'Completar',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  stepOf: 'Paso {{current}} de {{total}}',
  welcome: 'Bienvenido a OracleMonitor',
  welcomeDesc: 'Tu plataforma universal de monitoreo de oracle',
  selectRole: 'Selecciona tu rol para comenzar',
  continueAsGeneral: 'Continuar como usuario general',
  viewAgain: 'Ver recorrido de nuevo',
  resetConfirm:
    '¿Estás seguro de que quieres ver la integración de nuevo? Esto actualizará la página.',
  targetNotFound: 'Elemento objetivo no encontrado',
  guidedTour: {
    title: 'Recorrido Guiado',
    description: 'Tomemos un recorrido de 1-2 minutos para conocer las funciones principales',
    startTour: 'Iniciar Recorrido',
    skipForNow: 'Omitir por Ahora',
    finish: 'Finalizar Recorrido',
    progress: '{{current}}/{{total}}',
  },
  steps: {
    developer: {
      api: {
        title: 'Integración de API',
        description:
          'Aprende a integrar nuestra API de oracle para obtener datos de precios en tiempo real',
      },
      integration: {
        title: 'Integración rápida',
        description: 'Usa nuestro SDK para integrar datos de oracle en minutos',
      },
      monitoring: {
        title: 'Monitoreo en tiempo real',
        description: 'Rastrea el rendimiento del oracle y la calidad de los datos en tiempo real',
      },
    },
    protocol: {
      monitoring: {
        title: 'Monitoreo de oracle',
        description:
          'Monitorea la salud del oracle, el estado de los nodos y las métricas de rendimiento',
      },
      disputes: {
        title: 'Gestión de disputas',
        description: 'Maneja eficientemente las disputas de oracle y la validación de aserciones',
      },
      alerts: {
        title: 'Alertas inteligentes',
        description: 'Configura alertas personalizadas para recibir notificaciones de anomalías',
      },
    },
    general: {
      exploration: {
        title: 'Exploración de datos',
        description: 'Explora datos de oracle entre protocolos y tendencias de precios',
      },
      comparison: {
        title: 'Comparación de protocolos',
        description: 'Compara precios y rendimiento entre diferentes protocolos de oracle',
      },
      alerts: {
        title: 'Alertas de precios',
        description:
          'Configura alertas de desviación de precios para mantenerte al tanto de los movimientos del mercado',
      },
    },
  },
  roles: {
    developer: {
      title: 'Desarrollador',
      description: 'Construir aplicaciones usando datos de oracle',
    },
    protocol: {
      title: 'Equipo de protocolo',
      description: 'Gestionar la integración de oracle y las operaciones de nodos',
    },
    general: {
      title: 'Usuario general',
      description: 'Monitorear y analizar datos de oracle',
    },
  },
  tour: {
    dashboard: {
      title: 'Panel de Control',
      description:
        'Tu centro de comando central que muestra todas las métricas clave y el estado del sistema en tiempo real.',
    },
    alerts: {
      title: 'Alertas',
      description:
        'Ver y gestionar todas las alertas del sistema, incluyendo desviaciones de precios, notificaciones de nodos fuera de línea y más.',
    },
    protocols: {
      title: 'Protocolos',
      description:
        'Monitorea múltiples protocolos de oracle como Chainlink, Pyth, Band con datos en tiempo real y métricas de rendimiento.',
    },
    watchlist: {
      title: 'Lista de Seguimiento',
      description:
        'Agrega activos que te interesan para rastrear rápidamente cambios importantes de precios.',
    },
    sidebar: {
      title: 'Navegación',
      description:
        'Usa la barra lateral para acceder rápidamente a diferentes módulos funcionales.',
    },
    settings: {
      title: 'Configuración',
      description: 'Personaliza tus preferencias de monitoreo y configuraciones de notificación.',
    },
  },
  emptyStates: {
    alerts: {
      title: 'Sistema Saludable',
      description:
        'No hay alertas activas en este momento. Todos los protocolos de oracle están funcionando normalmente.',
      action: 'Configurar Reglas de Alerta',
      actionDesc:
        'Configura umbrales de alerta personalizados para recibir notificaciones de anomalías',
    },
    watchlist: {
      title: 'Comienza a Agregar Monitores',
      description:
        'Aún no has agregado ningún monitor. Comienza a construir tu lista de seguimiento.',
      action: 'Agregar Primer Monitor',
      actionDesc: 'Explora datos de oracle y agrega activos que te interesen',
    },
  },
};

export default onboarding;
