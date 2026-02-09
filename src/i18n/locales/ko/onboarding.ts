const onboarding = {
  title: 'OracleMonitor에 오신 것을 환영합니다',
  description: '여러 프로토콜을 위한 종합적인 오라클 모니터링 솔루션입니다.',
  getStarted: '시작하기',
  skipTour: '투어 건너뛰기',
  next: '다음',
  back: '뒤로',
  complete: '완료',
  cancel: '취소',
  confirm: '확인',
  stepOf: '{{current}} / {{total}} 단계',
  welcome: 'OracleMonitor에 오신 것을 환영합니다',
  welcomeDesc: '범용 오라클 모니터링 플랫폼',
  selectRole: '시작하려면 역할을 선택하세요',
  continueAsGeneral: '일반 사용자로 계속',
  viewAgain: '투어 다시 보기',
  resetConfirm: '온볇ィング을 다시 보시겠습니까? 페이지가 새로고침됩니다.',
  targetNotFound: '대상 요소를 찾을 수 없습니다',
  steps: {
    developer: {
      api: {
        title: 'API 통합',
        description: '실시간 가격 데이터를 가져오기 위해 오라클 API를 통합하는 방법 알아보기',
      },
      integration: {
        title: '빠른 통합',
        description: 'SDK를 사용하여 몇 분 안에 오라클 데이터 통합',
      },
      monitoring: {
        title: '실시간 모니터링',
        description: '실시간으로 오라클 성능 및 데이터 품질 추적',
      },
    },
    protocol: {
      monitoring: {
        title: '오라클 모니터링',
        description: '오라클 상태, 노드 상태 및 성능 메트릭 모니터링',
      },
      disputes: {
        title: '분쟁 관리',
        description: '오라클 분쟁 및 어서션 검증 효율적으로 처리',
      },
      alerts: {
        title: '스마트 알림',
        description: '이상 징후에 대한 알림을 받을 수 있는 사용자 정의 알림 설정',
      },
    },
    general: {
      exploration: {
        title: '데이터 탐색',
        description: '크로스 프로토콜 오라클 데이터 및 가격 추세 탐색',
      },
      comparison: {
        title: '프로토콜 비교',
        description: '다른 오라클 프로토콜 간의 가격 및 성능 비교',
      },
      alerts: {
        title: '가격 알림',
        description: '시장 동향을 파악하기 위해 가격 편차 알림 설정',
      },
    },
  },
  roles: {
    developer: {
      title: '개발자',
      description: '오라클 데이터를 사용하여 애플리케이션 구축',
    },
    protocol: {
      title: '프로토콜 팀',
      description: '오라클 통합 및 노드 운영 관리',
    },
    general: {
      title: '일반 사용자',
      description: '오라클 데이터 모니터링 및 분석',
    },
  },
  tour: {
    dashboard: {
      title: '대시보드 개요',
      description: '모든 주요 메트릭과 실시간 데이터를 여기에서 확인하세요.',
    },
    protocols: {
      title: '프로토콜 선택',
      description: '여기를 클릭하여 다른 오라클 프로토콜 간에 전환하세요.',
    },
    search: {
      title: '검색 기능',
      description: '검색을 사용하여 필요한 오라클 또는 자산을 빠르게 찾으세요.',
    },
    alerts: {
      title: '알림 센터',
      description: '모든 알림을 보고 관리하세요.',
    },
    settings: {
      title: '설정',
      description: '모니터링 기본 설정 및 알림 설정을 사용자 정의하세요.',
    },
  },
};

export default onboarding;
