const onboarding = {
  title: '欢迎使用 OracleMonitor',
  description: '适用于多种协议的综合预言机监控解决方案。',
  getStarted: '开始使用',
  skipTour: '跳过引导',
  next: '下一步',
  back: '返回',
  complete: '完成',
  cancel: '取消',
  confirm: '确认',
  stepOf: '第 {{current}} 步，共 {{total}} 步',
  welcome: '欢迎使用 OracleMonitor',
  welcomeDesc: '您的通用预言机监控平台',
  selectRole: '选择您的角色以开始',
  continueAsGeneral: '继续作为普通用户',
  viewAgain: '重新查看引导',
  resetConfirm: '确定要重新查看新手引导吗？这将刷新页面。',
  targetNotFound: '目标元素未找到',
  guidedTour: {
    title: '新手指引',
    description: '让我们用 1-2 分钟快速了解平台的主要功能',
    startTour: '开始指引',
    skipForNow: '暂时跳过',
    finish: '完成指引',
    progress: '{{current}}/{{total}}',
  },
  steps: {
    developer: {
      api: {
        title: 'API 集成',
        description: '了解如何集成我们的预言机 API，获取实时价格数据',
      },
      integration: {
        title: '快速集成',
        description: '使用 SDK 几分钟内完成预言机数据集成',
      },
      monitoring: {
        title: '实时监控',
        description: '实时跟踪预言机性能和数据质量',
      },
    },
    protocol: {
      monitoring: {
        title: '预言机监控',
        description: '监控预言机健康状况、节点状态和性能指标',
      },
      disputes: {
        title: '争议管理',
        description: '高效处理预言机争议和断言验证',
      },
      alerts: {
        title: '智能警报',
        description: '设置自定义警报，及时获取异常通知',
      },
    },
    general: {
      exploration: {
        title: '数据探索',
        description: '探索跨协议的预言机数据和价格趋势',
      },
      comparison: {
        title: '协议比较',
        description: '比较不同预言机协议的价格和性能',
      },
      alerts: {
        title: '价格警报',
        description: '设置价格偏差警报，掌握市场动态',
      },
    },
  },
  roles: {
    developer: {
      title: '开发者',
      description: '使用预言机数据构建应用程序',
    },
    protocol: {
      title: '项目方',
      description: '管理预言机集成和节点运营',
    },
    general: {
      title: '普通用户',
      description: '监控和分析预言机数据',
    },
  },
  tour: {
    dashboard: {
      title: 'Dashboard - 仪表板',
      description: '这是您的中央指挥中心，实时展示所有关键指标和系统健康状态。',
    },
    alerts: {
      title: 'Alerts - 告警中心',
      description: '在这里查看和管理所有系统告警，包括价格偏差、节点离线等重要通知。',
    },
    protocols: {
      title: 'Protocols - 协议监控',
      description: '查看 Chainlink、Pyth、Band 等多个预言机协议的实时数据和性能指标。',
    },
    sidebar: {
      title: '导航菜单',
      description: '通过侧边栏快速访问各个功能模块。',
    },
    settings: {
      title: '设置',
      description: '自定义您的监控偏好和通知设置。',
    },
  },
  emptyStates: {
    alerts: {
      title: '系统运行健康',
      description: '当前没有活跃告警，所有预言机协议正常运行。',
      action: '设置告警规则',
      actionDesc: '配置自定义告警阈值，及时获取异常通知',
    },
  },
};

export default onboarding;
