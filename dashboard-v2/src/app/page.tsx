import { SubscriptionService } from '@/services/subscriptionService';
import { DrePageClient } from '@/components/dre/DrePageClient';

export default async function Page() {
  const hasActiveSubscription = await SubscriptionService.hasActiveSubscription();
  
  return <DrePageClient hasActiveSubscription={hasActiveSubscription} />;
}
