'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto py-8">
        <h1 className="mb-8 text-center text-3xl font-bold">Insight API 文档</h1>
        <SwaggerUI url="/api/docs" />
      </div>
    </div>
  );
}
