import { FeedDetail } from '@/features/oracle/chainlink/components/FeedDetail';

interface PageProps {
  params: Promise<{
    address: string;
  }>;
}

export default async function FeedDetailPage({ params }: PageProps) {
  const { address } = await params;
  return <FeedDetail address={address} />;
}

export function generateMetadata({ params }: PageProps) {
  return Promise.resolve(params).then(({ address }) => ({
    title: `Feed ${address.slice(0, 8)}... - Chainlink`,
    description: `Chainlink Price Feed details for ${address}`,
  }));
}
