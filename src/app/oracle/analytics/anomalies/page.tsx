import { redirect } from 'next/navigation';

export default function AnomaliesPage() {
  redirect('/alerts?source=price_anomaly');
}
