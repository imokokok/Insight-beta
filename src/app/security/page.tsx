import { redirect } from 'next/navigation';

/**
 * Security Landing Page
 *
 * 将 /security 重定向到 /security/dashboard
 * 保持功能中心的短路径一致性
 */
export default function SecurityLandingPage() {
  redirect('/security/dashboard');
}
