import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "../../../api/client";
import {
  createListingPromotion,
  fetchListingDetail,
  fetchListingPromotionOptions,
  verifyListingPromotion,
} from "../../../api/listings";
import ListingCard from "../../../components/listing-card";
import logo from "../../../assets/images/orvix.png";

type PromotionPackage = {
  key: string;
  label: string;
  price: number;
  description: string;
};

type PaymentGateway = {
  key: string;
  label: string;
};

const DEFAULT_PACKAGES: PromotionPackage[] = [
  { key: "7_days", label: "7 Days", price: 500, description: "Featured for 7 days" },
  { key: "14_days", label: "14 Days", price: 1000, description: "Featured for 14 days" },
  { key: "30_days", label: "30 Days", price: 1300, description: "Featured for 30 days" },
];

export default function PromoteListingScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const listingId = Array.isArray(idParam) ? idParam[0] : idParam;

  const [packages, setPackages] = useState<PromotionPackage[]>(DEFAULT_PACKAGES);
  const [selectedPackage, setSelectedPackage] = useState("7_days");
  const [gateways, setGateways] = useState<PaymentGateway[]>([
    { key: "safepay", label: "Safe Pay" },
    { key: "stripe", label: "Stripe" },
  ]);
  const [selectedGateway, setSelectedGateway] = useState("safepay");
  const [stripePublishableKey, setStripePublishableKey] = useState("");

  // Stripe form fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const [quicklinkId, setQuicklinkId] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const [featuredListing, setFeaturedListing] = useState<any>(null);

  useEffect(() => {
    fetchListingPromotionOptions()
      .then((options) => {
        if (Array.isArray(options.packages) && options.packages.length > 0) {
          setPackages(options.packages);
        }
        if (Array.isArray(options.gateways) && options.gateways.length > 0) {
          setGateways(options.gateways);
          if (!options.gateways.some((g: any) => g.key === selectedGateway)) {
            setSelectedGateway(options.gateways[0].key);
          }
        }
        if (options.stripe_publishable_key) {
          setStripePublishableKey(options.stripe_publishable_key);
        }
      })
      .catch((requestError: any) => {
        // Fallback to default packages
        console.warn("Could not load remote promotion options:", requestError?.message);
      })
      .finally(() => setLoading(false));
  }, []);

  async function checkPayment(id = quicklinkId, waitForConfirmation = false) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const attempts = waitForConfirmation ? 10 : 1;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const result = await verifyListingPromotion(id);
        if (result.status === "paid") {
          setPaid(true);
          setCheckoutUrl("");
          if (listingId) {
            try {
              setFeaturedListing(await fetchListingDetail(listingId));
            } catch {
              setFeaturedListing(null);
            }
          }
          return;
        }
        if (result.status === "failed") {
          setError("The payment was not completed. You can try checkout again.");
          return;
        }
        if (attempt < attempts - 1) {
          await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        }
      }
      setError("Payment is still pending. Once SafePay confirms it, check again here.");
    } catch (requestError: any) {
      setError(requestError?.message || "Unable to verify the payment yet.");
    } finally {
      setBusy(false);
    }
  }

  async function createStripeToken(): Promise<string> {
    const rawNumber = cardNumber.replace(/\s+/g, "");
    if (!rawNumber || rawNumber.length < 12) {
      throw new Error("Please enter a valid card number.");
    }
    const cleanMonth = expiryMonth.trim();
    if (!cleanMonth || Number(cleanMonth) < 1 || Number(cleanMonth) > 12) {
      throw new Error("Please enter a valid expiry month (1-12).");
    }
    let cleanYear = expiryYear.trim();
    if (!cleanYear || cleanYear.length < 2) {
      throw new Error("Please enter a valid expiry year.");
    }
    if (cleanYear.length === 2) {
      cleanYear = `20${cleanYear}`;
    }
    const cleanCvc = cardCvc.trim();
    if (!cleanCvc || cleanCvc.length < 3) {
      throw new Error("Please enter a valid CVC code.");
    }

    if (!stripePublishableKey || !stripePublishableKey.startsWith("pk_")) {
      throw new Error(
        "Stripe publishable key is missing. Please ensure Stripe is configured in Admin Payment Settings."
      );
    }

    const bodyParams = new URLSearchParams({
      "card[number]": rawNumber,
      "card[exp_month]": cleanMonth,
      "card[exp_year]": cleanYear,
      "card[cvc]": cleanCvc,
    });

    const response = await fetch("https://api.stripe.com/v1/tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripePublishableKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });

    const json = await response.json();
    if (json.error) {
      throw new Error(json.error.message || "Card verification failed.");
    }

    return json.id;
  }

  async function startPayment() {
    if (!listingId || !selectedPackage || busy) return;
    setBusy(true);
    setError("");

    try {
      if (selectedGateway === "stripe") {
        const token = await createStripeToken();
        const result = await createListingPromotion(
          listingId,
          selectedPackage,
          "stripe",
          token,
          Platform.OS
        );

        if (result.paid) {
          setPaid(true);
          if (listingId) {
            try {
              setFeaturedListing(await fetchListingDetail(listingId));
            } catch {
              setFeaturedListing(null);
            }
          }
          return;
        }

        setError(result.message || "Payment could not be completed.");
        return;
      }

      // SafePay Gateway
      const checkout = await createListingPromotion(
        listingId,
        selectedPackage,
        "safepay",
        null,
        Platform.OS
      );

      if (!checkout.checkout_url) {
        throw new Error(checkout.message || "Checkout URL could not be generated.");
      }

      setQuicklinkId(checkout.quicklink_id);
      setCheckoutUrl(checkout.checkout_url);

      if (Platform.OS === "web") {
        let returnedFromCheckout = false;
        let apiOrigin = "";
        try {
          apiOrigin = new URL(BASE_URL).origin;
        } catch {
          apiOrigin = window.location.origin;
        }

        const removeReturnListeners = () => {
          window.removeEventListener("message", handlePaymentReturn);
          window.removeEventListener("focus", handleCheckoutFocus);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        };

        const verifyAfterReturn = () => {
          if (returnedFromCheckout) return;
          returnedFromCheckout = true;
          removeReturnListeners();
          void checkPayment(checkout.quicklink_id, true);
        };

        const handlePaymentReturn = (event: MessageEvent) => {
          if (
            event.origin !== apiOrigin ||
            event.data?.type !== "orvix-promotion-return"
          ) {
            return;
          }
          verifyAfterReturn();
        };

        const handleCheckoutFocus = () => verifyAfterReturn();
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") verifyAfterReturn();
        };

        window.addEventListener("message", handlePaymentReturn);
        window.addEventListener("focus", handleCheckoutFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        await WebBrowser.openBrowserAsync(checkout.checkout_url);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        checkout.checkout_url,
        "orvixapp://promotion-return"
      );

      if (result.type === "success" || result.type === "cancel") {
        await checkPayment(checkout.quicklink_id, true);
      }
    } catch (requestError: any) {
      setError(
        requestError?.message || "Unable to start the payment. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function openCheckout() {
    if (!checkoutUrl) return;
    try {
      await Linking.openURL(checkoutUrl);
    } catch (requestError: any) {
      setError(requestError?.message || "Unable to open the payment page.");
    }
  }

  if (paid) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.topbar}>
            <View style={styles.brand}>
              <Image source={logo} style={styles.brandLogo} resizeMode="contain" />
            </View>
            <Pressable
              onPress={() => router.replace("/account/my-listings")}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>← Back</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.successWrap}>
              <View style={styles.checkCircle}>
                <Text style={styles.successMark}>✓</Text>
              </View>
              <Text style={styles.cardTitle}>Promotion Activated!</Text>
              <Text style={styles.cardSubtitle}>
                Your listing has been featured successfully and will receive top visibility across ORVIX.
              </Text>
              {featuredListing ? (
                <View style={styles.featuredListingWrap}>
                  <Text style={styles.featuredBadge}>FEATURED NOW</Text>
                  <ListingCard
                    listing={featuredListing}
                    onPress={() =>
                      router.push({
                        pathname: "/listing/[id]",
                        params: { id: String(featuredListing.id) },
                      })
                    }
                  />
                </View>
              ) : null}
              <View style={styles.successActions}>
                <Pressable
                  onPress={() => router.replace("/(tabs)")}
                  style={styles.submitBtn}
                >
                  <Text style={styles.submitBtnText}>Explore Home Feed</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.replace("/account/my-listings")}
                  style={styles.secondaryActionBtn}
                >
                  <Text style={styles.secondaryActionText}>View My Listings</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Topbar: Logo on left, Back button on right */}
        <View style={styles.topbar}>
          <View style={styles.brand}>
            <Image source={logo} style={styles.brandLogo} resizeMode="contain" />
          </View>
          <Pressable onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back</Text>
          </Pressable>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Promote Your Listing</Text>
          <Text style={styles.cardSubtitle}>
            Choose a promotion package and payment method to feature your listing.
          </Text>

          {loading ? (
            <ActivityIndicator color="#0e7a7f" size="large" style={styles.loader} />
          ) : (
            <>
              {/* Packages Row */}
              <View style={styles.packageGrid}>
                {packages.map((pkg) => {
                  const isSelected = selectedPackage === pkg.key;
                  return (
                    <Pressable
                      key={pkg.key}
                      onPress={() => setSelectedPackage(pkg.key)}
                      style={[
                        styles.packageCard,
                        isSelected && styles.packageCardSelected,
                      ]}
                    >
                      <View style={styles.packageRow}>
                        <Text style={styles.packageName}>{pkg.label}</Text>
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                      </View>
                      <Text style={styles.packagePrice}>
                        PKR {Number(pkg.price).toLocaleString()}
                      </Text>
                      <Text style={styles.packageDesc}>{pkg.description}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Payment Gateways Row */}
              <View style={styles.gatewayBox}>
                {gateways.map((gtw) => {
                  const isSelected = selectedGateway === gtw.key;
                  return (
                    <Pressable
                      key={gtw.key}
                      onPress={() => setSelectedGateway(gtw.key)}
                      style={[
                        styles.gatewayPill,
                        isSelected && styles.gatewayPillSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.gatewayRadioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.gatewayLabel}>{gtw.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Stripe Card Input Form */}
              {selectedGateway === "stripe" && (
                <View style={styles.stripeBox}>
                  <Text style={styles.stripeTitle}>Card Information</Text>
                  <View style={styles.stripeField}>
                    <Text style={styles.stripeLabel}>Card Number</Text>
                    <TextInput
                      style={styles.stripeInput}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={cardNumber}
                      onChangeText={setCardNumber}
                      maxLength={19}
                    />
                  </View>
                  <View style={styles.stripeRow}>
                    <View style={[styles.stripeField, { flex: 1 }]}>
                      <Text style={styles.stripeLabel}>Expiry Month</Text>
                      <TextInput
                        style={styles.stripeInput}
                        placeholder="MM"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={expiryMonth}
                        onChangeText={setExpiryMonth}
                        maxLength={2}
                      />
                    </View>
                    <View style={[styles.stripeField, { flex: 1 }]}>
                      <Text style={styles.stripeLabel}>Expiry Year</Text>
                      <TextInput
                        style={styles.stripeInput}
                        placeholder="YYYY"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={expiryYear}
                        onChangeText={setExpiryYear}
                        maxLength={4}
                      />
                    </View>
                    <View style={[styles.stripeField, { flex: 1 }]}>
                      <Text style={styles.stripeLabel}>CVC</Text>
                      <TextInput
                        style={styles.stripeInput}
                        placeholder="CVC"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        secureTextEntry
                        value={cardCvc}
                        onChangeText={setCardCvc}
                        maxLength={4}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Error Display */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* SafePay verification active state */}
              {checkoutUrl ? (
                <View style={styles.pendingCheckoutBox}>
                  <Pressable
                    onPress={openCheckout}
                    style={styles.submitBtn}
                    disabled={busy}
                  >
                    <Text style={styles.submitBtnText}>Open SafePay Checkout</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => checkPayment()}
                    style={styles.verifyBtn}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color="#0e7a7f" />
                    ) : (
                      <Text style={styles.verifyBtnText}>
                        I have paid, check status
                      </Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                /* Primary Submit Button */
                <View style={styles.submitRow}>
                  <Pressable
                    onPress={startPayment}
                    style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
                    disabled={busy || loading}
                  >
                    {busy ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.submitBtnText}>Continue to Payment</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f8",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe7ea",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 20,
    shadowColor: "#14212b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandLogo: {
    height: 38,
    width: 140,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ea",
    backgroundColor: "#f7fafb",
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#14212b",
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dfe7ea",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 32,
    shadowColor: "#08232a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#14212b",
    textAlign: "center",
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 16,
    color: "#5c6d77",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },
  loader: {
    marginVertical: 40,
  },
  packageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  packageCard: {
    flex: 1,
    minWidth: 200,
    borderWidth: 1,
    borderColor: "#dfe7ea",
    borderRadius: 18,
    backgroundColor: "#fbfcfd",
    padding: 20,
    gap: 10,
  },
  packageCardSelected: {
    borderColor: "#0e7a7f",
    backgroundColor: "#f2f9f9",
  },
  packageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packageName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#14212b",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: "#0e7a7f",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0e7a7f",
  },
  packagePrice: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0e7a7f",
  },
  packageDesc: {
    fontSize: 14,
    color: "#5c6d77",
    lineHeight: 20,
  },
  gatewayBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "center",
    marginVertical: 12,
  },
  gatewayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#dfe7ea",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 150,
  },
  gatewayPillSelected: {
    borderColor: "#0e7a7f",
    backgroundColor: "#f2f9f9",
  },
  gatewayRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    alignItems: "center",
    justifyContent: "center",
  },
  gatewayLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#14212b",
  },
  stripeBox: {
    marginTop: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#dfe7ea",
    borderRadius: 16,
    backgroundColor: "#fbfcfd",
  },
  stripeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#14212b",
    marginBottom: 16,
  },
  stripeField: {
    marginBottom: 14,
  },
  stripeRow: {
    flexDirection: "row",
    gap: 12,
  },
  stripeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#14212b",
    marginBottom: 6,
  },
  stripeInput: {
    borderWidth: 1,
    borderColor: "#dfe7ea",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#14212b",
  },
  errorText: {
    color: "#c52424",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
  },
  submitRow: {
    marginTop: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtn: {
    backgroundColor: "#0e7a7f",
    minHeight: 52,
    paddingHorizontal: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0e7a7f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  pendingCheckoutBox: {
    marginTop: 24,
    alignItems: "center",
    gap: 12,
  },
  verifyBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  verifyBtnText: {
    color: "#0e7a7f",
    fontSize: 15,
    fontWeight: "700",
  },
  successWrap: {
    alignItems: "center",
    paddingVertical: 20,
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ecfdf5",
    borderWidth: 2,
    borderColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successMark: {
    fontSize: 34,
    fontWeight: "800",
    color: "#10b981",
  },
  featuredListingWrap: {
    width: "100%",
    maxWidth: 420,
    marginVertical: 20,
  },
  featuredBadge: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  successActions: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
    marginTop: 10,
  },
  secondaryActionBtn: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dfe7ea",
    backgroundColor: "#f7fafb",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: "#14212b",
    fontSize: 15,
    fontWeight: "700",
  },
});
