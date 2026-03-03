import { redirect } from 'next/navigation';

export const dynamic = 'force-static';
export const revalidate = 0;

export default function OraclePage() {
  redirect('/overview');
}
