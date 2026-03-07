/**
 * Breadcrumb Types - 面包屑导航类型定义
 */

import type { ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}
