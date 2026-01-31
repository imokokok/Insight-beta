/**
 * Swagger UI API Documentation
 *
 * API 文档页面
 */

import { getApiDocs } from '@/lib/swagger';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const spec = getApiDocs();

  return (
    <section className="container mx-auto p-4">
      <SwaggerUI spec={spec} />
    </section>
  );
}
