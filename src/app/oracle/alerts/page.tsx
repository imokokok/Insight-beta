'use client';

import { AlertRulesManager } from '@/components/features/alert/AlertRulesManager';
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from '@/components/common/AnimatedContainer';
import {
  Container,
  Stack,
  Row,
} from '@/components/common/Layout';
import {
  ResponsivePadding,
  MobileOnly,
  DesktopOnly,
} from '@/components/common/Responsive';

export default function AlertsPage() {
  return <AlertRulesManager />;
}
