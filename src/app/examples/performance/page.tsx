'use client';

import { PerformanceHooksExample } from '@/components/examples/PerformanceHooksExample';
import { PageHeader } from '@/components/common/PageHeader';

export default function PerformanceExamplesPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <PageHeader
        title="性能优化示例"
        description="展示项目中可用的性能优化 Hooks 和组件"
      />
      
      <div className="mt-8">
        <PerformanceHooksExample />
      </div>
    </div>
  );
}
