import type { Bridge, Transfer } from '../types';

export function getBridgeStatusConfig(status: Bridge['status']) {
  const configs = {
    active: { status: 'active' as const, label: 'Active' },
    inactive: { status: 'offline' as const, label: 'Inactive' },
    degraded: { status: 'warning' as const, label: 'Degraded' },
  };
  return configs[status] ?? configs.inactive;
}

export function getTransferStatusConfig(status: Transfer['status']) {
  const configs = {
    pending: { status: 'warning' as const, label: 'Pending', icon: 'Loader2' },
    completed: { status: 'active' as const, label: 'Completed', icon: 'CheckCircle' },
    failed: { status: 'offline' as const, label: 'Failed', icon: 'XCircle' },
  };
  return configs[status] ?? configs.pending;
}
