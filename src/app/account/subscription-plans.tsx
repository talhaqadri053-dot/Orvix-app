import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchPricingPlans, enrollFreePlan, submitBankTransfer } from "../../api/subscriptionService";

export default function SubscriptionPlansScreen() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyPlan, setBusyPlan] = useState<number | null>(null);
  const [bankPlan, setBankPlan] = useState<number | null>(null);
  const [transactionReference, setTransactionReference] = useState("");

  const loadPlans = useCallback(async (refresh = false) => {
    setError("");
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setPlans(await fetchPricingPlans());
    } catch (requestError: any) {
      setError(requestError?.message || "Unable to load pricing plans.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  async function enrollFree(planId: number) {
    setBusyPlan(planId);
    setError("");
    try {
      await enrollFreePlan(planId);
      Alert.alert("Plan activated", "Your free subscription is active.");
      await loadPlans(true);
    } catch (requestError: any) {
      setError(requestError?.message || "Unable to activate this plan.");
    } finally {
      setBusyPlan(null);
    }
  }

  async function submitTransfer(planId: number) {
    if (!transactionReference.trim()) {
      setError("Enter your bank transfer reference.");
      return;
    }
    setBusyPlan(planId);
    setError("");
    try {
      await submitBankTransfer(planId, transactionReference.trim());
      setTransactionReference("");
      setBankPlan(null);
      Alert.alert("Transfer submitted", "Your subscription will activate after admin approval.");
    } catch (requestError: any) {
      setError(requestError?.message || "Unable to submit this transfer.");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPlans(true)} />}>
        <Text style={styles.eyebrow}>MEMBERSHIP</Text>
        <Text style={styles.title}>Pricing plans</Text>
        {loading ? <ActivityIndicator color="#36705d" style={styles.loader} /> : null}
        {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text><Pressable onPress={() => loadPlans()}><Text style={styles.link}>Retry</Text></Pressable></View> : null}
        {!loading && !error && plans.length === 0 ? <Text style={styles.empty}>No plans are available.</Text> : null}
        {plans.map((plan) => (
          <View key={plan.id} style={styles.plan}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.price}>{Number(plan.price) === 0 ? "Free" : `$${Number(plan.price).toFixed(2)}`}</Text>
            <Text style={styles.meta}>{plan.duration} · {plan.max_listings} listings · {plan.featured_listings} featured</Text>
            {Number(plan.price) === 0 ? (
              <Pressable onPress={() => enrollFree(plan.id)} disabled={busyPlan === plan.id} style={styles.primaryButton}>
                {busyPlan === plan.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Activate plan</Text>}
              </Pressable>
            ) : (
              <>
                <Pressable onPress={() => { setBankPlan(bankPlan === plan.id ? null : plan.id); setError(""); }} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>{bankPlan === plan.id ? "Cancel bank transfer" : "Bank transfer"}</Text>
                </Pressable>
                {bankPlan === plan.id ? <View style={styles.transferForm}>
                  <TextInput style={styles.input} value={transactionReference} onChangeText={setTransactionReference} placeholder="Transaction reference" />
                  <Pressable onPress={() => submitTransfer(plan.id)} disabled={busyPlan === plan.id} style={styles.primaryButton}>
                    {busyPlan === plan.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Submit transfer</Text>}
                  </Pressable>
                </View> : null}
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3f7fc" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 18, paddingBottom: 44 },
  eyebrow: { color: "#36705d", fontSize: 11, fontWeight: "800" },
  title: { color: "#172b27", fontSize: 25, fontWeight: "800", marginTop: 4, marginBottom: 18 },
  loader: { marginVertical: 35 },
  errorBox: { backgroundColor: "#fff", padding: 14, borderRadius: 8, marginBottom: 12 },
  error: { color: "#b91c1c", marginBottom: 8 },
  link: { color: "#36705d", fontWeight: "700" },
  empty: { color: "#64748b", textAlign: "center", padding: 20 },
  plan: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe4f0", borderRadius: 8, padding: 18, marginBottom: 12 },
  planName: { color: "#172b27", fontSize: 18, fontWeight: "800" },
  price: { color: "#14532d", fontSize: 24, fontWeight: "900", marginTop: 8 },
  meta: { color: "#64748b", fontSize: 13, marginTop: 5, marginBottom: 14 },
  primaryButton: { minHeight: 44, alignItems: "center", justifyContent: "center", backgroundColor: "#36705d", borderRadius: 7, paddingHorizontal: 14 },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondaryButton: { minHeight: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#36705d", borderRadius: 7 },
  secondaryText: { color: "#36705d", fontWeight: "800" },
  transferForm: { marginTop: 10 },
  input: { minHeight: 44, borderWidth: 1, borderColor: "#cbd9d0", borderRadius: 7, paddingHorizontal: 12, marginBottom: 9 },
});