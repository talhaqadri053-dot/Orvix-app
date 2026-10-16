import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchSeller, fetchSellerListings } from "../../api/sellers";
import ListingCard from "../../components/listing-card";

export default function SellerScreen() {
  const { identifier: identifierParam } = useLocalSearchParams<{
    identifier?: string;
  }>();
  const router = useRouter();
  const identifier = Array.isArray(identifierParam)
    ? identifierParam[0]
    : identifierParam;
  const [seller, setSeller] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);

  const loadSeller = useCallback(
    async (page = 1, append = false) => {
      if (!identifier) {
        setLoading(false);
        setError("Invalid seller identifier.");
        return;
      }

      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");

      try {
        const [profileResponse, listingsResponse] = await Promise.all([
          append ? Promise.resolve(null) : fetchSeller(identifier),
          fetchSellerListings(identifier, { page, per_page: 15 }),
        ]);

        if (!append) {
          setSeller(profileResponse);
          setImageError(false);
        }

        const nextListings = listingsResponse?.data || [];
        setListings((current) => {
          if (!append) return nextListings;
          const existingIds = new Set(current.map((listing) => listing.id));
          return [
            ...current,
            ...nextListings.filter((listing) => !existingIds.has(listing.id)),
          ];
        });
        setPagination(listingsResponse?.meta || null);
      } catch (requestError) {
        setError(requestError?.message || "Unable to load seller information.");
        if (!append) {
          setSeller(null);
          setListings([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [identifier],
  );

  useEffect(() => {
    loadSeller();
  }, [loadSeller]);

  const loadMore = () => {
    if (!loadingMore && pagination?.current_page < pagination?.last_page) {
      loadSeller(pagination.current_page + 1, true);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSeller(1);
  };

  const handleCall = () => {
    if (seller?.phone) Linking.openURL(`tel:${seller.phone}`);
  };

  const handleWhatsApp = () => {
    if (!seller?.whatsapp_phone) return;
    const cleanPhone = seller.whatsapp_phone.replace(/[^0-9]/g, "");
    Linking.openURL(`https://wa.me/${cleanPhone}`);
  };

  if (loading && !seller) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.statusText}>Loading seller...</Text>
      </SafeAreaView>
    );
  }

  if (error && !seller) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => loadSeller()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {seller?.name || "Seller"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#1d4ed8"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          {seller?.image_url && !imageError ? (
            <Image
              source={{ uri: seller.image_url }}
              style={styles.avatar}
              contentFit="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>?</Text>
            </View>
          )}
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{seller?.name}</Text>
            {seller?.designation ? (
              <Text style={styles.designation}>{seller.designation}</Text>
            ) : null}
            {seller?.email_verified ? (
              <Text style={styles.badge}>Email verified</Text>
            ) : null}
            {seller?.is_dealer ? (
              <Text style={styles.badge}>Dealer</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.infoSection}>
          {seller?.about_me ? (
            <Text style={styles.about}>{seller.about_me}</Text>
          ) : null}
          {seller?.address || seller?.country ? (
            <Text style={styles.infoText}>
              {[seller.address, seller.country].filter(Boolean).join(" • ")}
            </Text>
          ) : null}
          {seller?.member_since ? (
            <Text style={styles.infoText}>
              Member since {new Date(seller.member_since).toLocaleDateString()}
            </Text>
          ) : null}
          <Text style={styles.statsText}>
            {seller?.total_listings ?? 0} listings •{" "}
            {seller?.reviews_count ?? 0} reviews
          </Text>
          <View style={styles.actions}>
            {seller?.phone ? (
              <Pressable onPress={handleCall} style={styles.callButton}>
                <Text style={styles.callText}>Call</Text>
              </Pressable>
            ) : null}
            {seller?.whatsapp_phone ? (
              <Pressable onPress={handleWhatsApp} style={styles.whatsappButton}>
                <Text style={styles.whatsappText}>WhatsApp</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.listingsHeader}>
          <Text style={styles.sectionTitle}>Seller listings</Text>
          <Text style={styles.listingsCount}>{listings.length} loaded</Text>
        </View>
        {error ? <Text style={styles.inlineError}>{error}</Text> : null}
        {listings.length === 0 && !loading ? (
          <Text style={styles.emptyText}>No active listings found.</Text>
        ) : null}
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onPress={(item) =>
              router.push({
                pathname: "/listing/[id]",
                params: { id: String(item.id) },
              })
            }
          />
        ))}
        {pagination?.current_page < pagination?.last_page ? (
          <Pressable
            onPress={loadMore}
            disabled={loadingMore}
            style={styles.loadMoreButton}
          >
            {loadingMore ? (
              <ActivityIndicator color="#1d4ed8" />
            ) : (
              <Text style={styles.loadMoreText}>Load more</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3f7fc" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  statusText: { marginTop: 10, color: "#64748b" },
  errorText: { color: "#64748b", textAlign: "center", marginBottom: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#dbe4f0",
  },
  backButton: { padding: 6 },
  backText: { color: "#1d4ed8", fontWeight: "600" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  headerSpacer: { width: 54 },
  content: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 48,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe4f0",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#e2e8f0",
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e2e8f0",
  },
  avatarPlaceholderText: { color: "#64748b", fontWeight: "700", fontSize: 22 },
  profileCopy: { flex: 1, marginLeft: 14 },
  name: { color: "#111827", fontSize: 20, fontWeight: "700" },
  designation: { color: "#64748b", marginTop: 4 },
  badge: {
    alignSelf: "flex-start",
    color: "#1e40af",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginTop: 5,
    fontSize: 11,
    fontWeight: "700",
  },
  infoSection: { paddingVertical: 16 },
  about: { color: "#334155", fontSize: 14, lineHeight: 21, marginBottom: 8 },
  infoText: { color: "#64748b", fontSize: 13, marginTop: 5 },
  statsText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  callButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callText: { color: "#fff", fontWeight: "700" },
  whatsappButton: {
    backgroundColor: "#22c55e",
    borderRadius: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  whatsappText: { color: "#fff", fontWeight: "700" },
  listingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { color: "#111827", fontSize: 20, fontWeight: "800" },
  listingsCount: { color: "#64748b", fontSize: 12 },
  inlineError: { color: "#b91c1c", marginBottom: 10 },
  emptyText: { color: "#64748b", textAlign: "center", paddingVertical: 24 },
  primaryButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  loadMoreButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  loadMoreText: { color: "#1d4ed8", fontWeight: "700" },
});
