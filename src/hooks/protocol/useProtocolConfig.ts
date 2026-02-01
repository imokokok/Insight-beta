'use client';

import useSWR from 'swr';
import type { OracleProtocol, OracleInstance, OracleConfig, SupportedChain } from '@/lib/types';

interface UseProtocolConfigOptions {
  instanceId?: string;
  protocol?: OracleProtocol;
  refreshInterval?: number;
}

interface ProtocolConfigResponse {
  instances: OracleInstance[];
  templates: ConfigTemplate[];
}

interface ConfigTemplate {
  id: string;
  name: string;
  description?: string;
  protocol: OracleProtocol;
  config: Partial<OracleConfig>;
  supportedChains: SupportedChain[];
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch protocol config');
  }
  return response.json();
};

export function useProtocolConfig(options: UseProtocolConfigOptions = {}) {
  const { instanceId, protocol, refreshInterval = 60000 } = options;

  const params = new URLSearchParams();
  if (instanceId) params.append('instanceId', instanceId);
  if (protocol) params.append('protocol', protocol);

  const url = `/api/oracle/config?${params.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<ProtocolConfigResponse>(url, fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  });

  return {
    instances: data?.instances ?? [],
    templates: data?.templates ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useProtocolInstance(instanceId: string) {
  const { instances, isLoading, error, refresh } = useProtocolConfig({
    instanceId,
  });

  const instance = instances.find((i) => i.id === instanceId);

  return {
    instance,
    isLoading,
    error,
    refresh,
  };
}

export function useCreateInstance() {
  const createInstance = async (
    protocol: OracleProtocol,
    name: string,
    chain: SupportedChain,
    config: Partial<OracleConfig>,
  ): Promise<OracleInstance> => {
    const response = await fetch('/api/oracle/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        protocol,
        name,
        chain,
        config,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create instance');
    }

    return response.json();
  };

  return { createInstance };
}

export function useUpdateInstance() {
  const updateInstance = async (
    instanceId: string,
    updates: Partial<OracleConfig>,
  ): Promise<OracleInstance> => {
    const response = await fetch(`/api/oracle/config/${instanceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update instance');
    }

    return response.json();
  };

  return { updateInstance };
}

export function useDeleteInstance() {
  const deleteInstance = async (instanceId: string): Promise<void> => {
    const response = await fetch(`/api/oracle/config/${instanceId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete instance');
    }
  };

  return { deleteInstance };
}

export function useProtocolTemplates(protocol: OracleProtocol) {
  const { templates, isLoading, error } = useProtocolConfig({ protocol });

  const protocolTemplates = templates.filter((t) => t.protocol === protocol);

  return {
    templates: protocolTemplates,
    isLoading,
    error,
  };
}
