import { AirnodeDetail } from '@/features/oracle/api3/components/AirnodeDetail';

interface PageProps {
  params: Promise<{
    address: string;
  }>;
}

export default async function AirnodeDetailPage({ params }: PageProps) {
  const { address } = await params;
  return <AirnodeDetail address={address} />;
}

export function generateMetadata({ params }: PageProps) {
  return Promise.resolve(params).then(({ address }) => ({
    title: `Airnode ${address.slice(0, 8)}... - API3`,
    description: `API3 Airnode details for ${address}`,
  }));
}
