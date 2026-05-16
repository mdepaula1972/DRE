import { createClient } from '@/utils/supabase/server';

export interface Subscription {
  id: string;
  user_id: string;
  status: string;
  price_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_end: string;
}

export const SubscriptionService = {
  async getUserSubscription(): Promise<Subscription | null> {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Subscription;
  },

  async hasActiveSubscription(): Promise<boolean> {
    const sub = await this.getUserSubscription();
    // Stripe status 'active' ou 'trialing' geralmente significam acesso liberado
    return sub !== null && (sub.status === 'active' || sub.status === 'trialing');
  }
};
