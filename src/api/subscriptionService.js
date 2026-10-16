import api from './client';

export async function fetchPricingPlans() {
  const { data } = await api.get('/pricing-plans');
  return data?.data || [];
}

export async function enrollFreePlan(planId) {
  const { data } = await api.post('/subscriptions/enroll', { plan_id: planId });
  return data?.data?.subscription || null;
}

export async function payForPlanWithStripe(planId, stripeToken) {
  const { data } = await api.post(`/subscriptions/${encodeURIComponent(String(planId))}/stripe`, {
    stripe_token: stripeToken,
  });
  return data?.data?.subscription || null;
}

export async function submitBankTransfer(planId, transactionReference) {
  const { data } = await api.post(`/subscriptions/${encodeURIComponent(String(planId))}/bank`, {
    tnx_info: transactionReference,
  });
  return data?.data?.subscription || null;
}