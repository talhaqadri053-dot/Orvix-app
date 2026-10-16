import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchListingDetail } from "../../api/listings";
import { checkWishlist, toggleWishlist } from "../../api/wishlist";
import ListingReviews from "../../components/listing-reviews";
import ReportListingModal from "../../components/report-listing-modal";
import { useAuth } from "../../hooks/useAuth";
import { applyForJob, createBooking } from "../../api/bookingService";

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const listingId = Array.isArray(id) ? id[0] : id;

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [favLoading, setFavLoading] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [reloadToken, setReloadToken] = useState(0);
  const [reportVisible, setReportVisible] = useState(false);
  const [bookingStartDate, setBookingStartDate] = useState("");
  const [bookingEndDate, setBookingEndDate] = useState("");
  const [applicationDescription, setApplicationDescription] = useState("");
  const [activityBusy, setActivityBusy] = useState(false);

  useEffect(() => {
    if (!listingId) {
      setLoading(false);
      setError("Invalid listing ID.");
      return;
    }
    let isCurrentRequest = true;
    setLoading(true);
    setError("");
    setListing(null);
    setImageError(false);

    Promise.all([
      fetchListingDetail(listingId),
      isAuthenticated
        ? checkWishlist(listingId).catch(() => false)
        : Promise.resolve(false),
    ])
      .then(([detail, fav]) => {
        if (isCurrentRequest) {
          setListing(detail);
          setSelectedImage(detail?.thumb_image_url || null);
          setImageError(false);
          setIsFavorited(Boolean(fav));
        }
      })
      .catch((err) => {
        if (isCurrentRequest)
          setError(err?.message || "Unable to load listing details.");
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [listingId, reloadToken, isAuthenticated]);

  const handleToggleFav = async () => {
    if (!listingId || favLoading) return;
    if (!isAuthenticated) {
      Alert.alert(
        "Sign in required",
        "Please sign in to save listings to your favorites.",
      );
      return;
    }
    setFavLoading(true);
    try {
      const res = await toggleWishlist(listingId);
      setIsFavorited(Boolean(res?.is_favorited));
    } catch (e) {
      setError(e?.message || "Unable to update your favorites.");
    } finally {
      setFavLoading(false);
    }
  };

  const selectImage = (imageUrl: string | null) => {
    setSelectedImage(imageUrl);
    setImageError(false);
  };

  const handleCall = () => {
    const phone = listing?.agent?.phone || listing?.agent?.whatsapp_phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = () => {
    const phone = listing?.agent?.whatsapp_phone || listing?.agent?.phone;
    if (phone) {
      const clean = phone.replace(/[^0-9]/g, "");
      const text = encodeURIComponent(
        `Hi, I am interested in: "${listing?.title}" on Orvix.`,
      );
      Linking.openURL(`https://wa.me/${clean}?text=${text}`);
    }
  };

  const requireSignIn = (returnTo: string) => {
    router.push({ pathname: "/login", params: { returnTo } });
  };

  const submitBooking = async () => {
    if (!isAuthenticated) return requireSignIn(`/listing/${listingId}`);
    if (!bookingStartDate || !bookingEndDate) {
      setError("Enter both booking dates.");
      return;
    }
    setActivityBusy(true);
    setError("");
    try {
      await createBooking({ listingId: listing.id, startDate: bookingStartDate, endDate: bookingEndDate });
      Alert.alert("Booking created", "Your booking request has been saved.");
      setBookingStartDate("");
      setBookingEndDate("");
    } catch (requestError: any) {
      setError(requestError?.message || "Unable to create booking.");
    } finally {
      setActivityBusy(false);
    }
  };

  const submitJobApplication = async () => {
    if (!isAuthenticated) return requireSignIn(`/listing/${listingId}`);
    if (!applicationDescription.trim()) {
      setError("Add a short message with your application.");
      return;
    }
    setActivityBusy(true);
    setError("");
    try {
      await applyForJob({ listingId: listing.id, description: applicationDescription.trim() });
      Alert.alert("Application submitted", "Your application has been sent to the listing owner.");
      setApplicationDescription("");
    } catch (requestError: any) {
      setError(requestError?.message || "Unable to submit your application.");
    } finally {
      setActivityBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>Loading ad...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={() => setReloadToken((current) => current + 1)}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Ad not found or expired.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backIconBtn}>
          <Text style={styles.backIconText}>← Back</Text>
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {listing.title}
        </Text>
        <Pressable onPress={handleToggleFav} style={styles.favBtn}>
          <Text style={[styles.favIcon, isFavorited && styles.favIconActive]}>
            {isFavorited ? "♥" : "♡"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setReportVisible(true)}
          style={styles.reportBtn}
        >
          <Text style={styles.reportText}>Report</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main hero image */}
        <View style={styles.imageBox}>
          {selectedImage && !imageError ? (
            <Image
              source={{ uri: selectedImage }}
              style={styles.image}
              contentFit="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <Text style={styles.noImageText}>No image available</Text>
          )}
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{listing.display_price}</Text>
          </View>
        </View>

        {/* Gallery thumbnails */}
        {listing.galleries && listing.galleries.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbScroll}
          >
            <Pressable
              onPress={() => selectImage(listing.thumb_image_url || null)}
              style={[
                styles.thumbBox,
                selectedImage === listing.thumb_image_url &&
                  styles.thumbBoxActive,
              ]}
            >
              {listing.thumb_image_url ? (
                <Image
                  source={{ uri: listing.thumb_image_url }}
                  style={styles.thumb}
                  contentFit="cover"
                />
              ) : null}
            </Pressable>
            {listing.galleries.map((g: any) => (
              <Pressable
                key={g.id}
                onPress={() => selectImage(g.image_url || null)}
                style={[
                  styles.thumbBox,
                  selectedImage === g.image_url && styles.thumbBoxActive,
                ]}
              >
                {g.image_url ? (
                  <Image
                    source={{ uri: g.image_url }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{listing.title}</Text>

          <View style={styles.locationRow}>
            <Text style={styles.locationText}>
              📍{" "}
              {[listing.city?.name, listing.address]
                .filter(Boolean)
                .join(" • ") || "Location unavailable"}
            </Text>
            <Text style={styles.dateText}>📅 {listing.formatted_date}</Text>
          </View>

          {(listing.category?.name ||
            listing.sub_category?.name ||
            listing.views !== undefined ||
            listing.reviews_count > 0) && (
            <Text style={styles.metaText}>
              {[
                listing.category?.name,
                listing.sub_category?.name,
                listing.views !== undefined ? `${listing.views} views` : null,
                listing.reviews_count > 0
                  ? `${listing.average_rating} rating (${listing.reviews_count})`
                  : null,
              ]
                .filter(Boolean)
                .join(" • ")}
            </Text>
          )}

          {/* Seller Card */}
          {listing.agent && (
            <View style={styles.sellerCard}>
              {listing.agent.avatar_url ? (
                <Image
                  source={{ uri: listing.agent.avatar_url }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>?</Text>
                </View>
              )}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/seller/[identifier]",
                    params: { identifier: String(listing.agent.id) },
                  })
                }
                style={styles.sellerDetails}
              >
                <Text style={styles.sellerLabel}>SELLER</Text>
                <Text style={styles.sellerName}>{listing.agent.name}</Text>
                <Text style={styles.sellerEmail}>{listing.agent.email}</Text>
              </Pressable>
              <View style={styles.sellerButtons}>
                {(listing.agent.phone || listing.agent.whatsapp_phone) && (
                  <Pressable onPress={handleCall} style={styles.actionCall}>
                    <Text style={styles.actionCallText}>Call</Text>
                  </Pressable>
                )}
                {(listing.agent.whatsapp_phone || listing.agent.phone) && (
                  <Pressable onPress={handleWhatsApp} style={styles.actionWa}>
                    <Text style={styles.actionWaText}>WhatsApp</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {listing.category?.id === 3 ? (
            <View style={styles.activityPanel}>
              <Text style={styles.sectionTitle}>Apply for this job</Text>
              <TextInput
                value={applicationDescription}
                onChangeText={setApplicationDescription}
                placeholder="Introduce yourself and your experience"
                placeholderTextColor="#94a3b8"
                multiline
                style={styles.activityInput}
              />
              <Pressable onPress={submitJobApplication} disabled={activityBusy} style={styles.activityButton}>
                {activityBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.activityButtonText}>Submit application</Text>}
              </Pressable>
            </View>
          ) : (
            <View style={styles.activityPanel}>
              <Text style={styles.sectionTitle}>Book this listing</Text>
              <View style={styles.bookingDates}>
                <TextInput value={bookingStartDate} onChangeText={setBookingStartDate} placeholder="Start date (YYYY-MM-DD)" placeholderTextColor="#94a3b8" style={[styles.activityInput, styles.bookingDateInput]} />
                <TextInput value={bookingEndDate} onChangeText={setBookingEndDate} placeholder="End date (YYYY-MM-DD)" placeholderTextColor="#94a3b8" style={[styles.activityInput, styles.bookingDateInput]} />
              </View>
              <Pressable onPress={submitBooking} disabled={activityBusy} style={styles.activityButton}>
                {activityBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.activityButtonText}>Request booking</Text>}
              </Pressable>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.desc}>{listing.description}</Text>
          </View>

          {/* Features */}
          {listing.features && listing.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Features</Text>
              <View style={styles.featuresList}>
                {listing.features.map((f: any) => (
                  <View key={f.id} style={styles.featureItem}>
                    <Text style={styles.featureCheck}>✓</Text>
                    <Text style={styles.featureName}>{f.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          <ListingReviews
            reviews={listing.reviews}
            averageRating={listing.average_rating}
            reviewsCount={listing.reviews_count}
          />
        </View>
      </ScrollView>
      <ReportListingModal
        visible={reportVisible}
        listingId={listingId}
        onClose={() => setReportVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f7fc",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#dbe4f0",
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginHorizontal: 12,
    textAlign: "center",
  },
  backIconBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backIconText: {
    color: "#1d4ed8",
    fontWeight: "600",
    fontSize: 14,
  },
  favBtn: {
    padding: 6,
  },
  favIcon: {
    fontSize: 22,
    color: "#94a3b8",
  },
  favIconActive: {
    color: "#e11d48",
  },
  reportBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  reportText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingBottom: 40,
  },
  imageBox: {
    width: "100%",
    height: 280,
    position: "relative",
    backgroundColor: "#edf2f9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  noImageText: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
    marginTop: 130,
  },
  pricePill: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(16, 25, 21, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pricePillText: {
    color: "#60a5fa",
    fontSize: 18,
    fontWeight: "700",
  },
  thumbScroll: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  thumbBox: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbBoxActive: {
    borderColor: "#1d4ed8",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  content: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#dbe4f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 28,
  },
  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  locationText: {
    fontSize: 13,
    color: "#64748b",
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  metaText: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 13,
  },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f7fc",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#e2e8f0",
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  avatarPlaceholderText: {
    color: "#64748b",
    fontWeight: "700",
  },
  sellerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  sellerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
  },
  sellerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  sellerEmail: {
    fontSize: 12,
    color: "#64748b",
  },
  sellerButtons: {
    flexDirection: "column",
    gap: 6,
  },
  activityPanel: {
    marginTop: 18,
    padding: 14,
    backgroundColor: "#f1f8f4",
    borderWidth: 1,
    borderColor: "#d5e7dc",
    borderRadius: 8,
  },
  bookingDates: { flexDirection: "row", gap: 8 },
  bookingDateInput: { flex: 1 },
  activityInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#cbd9d0",
    borderRadius: 7,
    backgroundColor: "#fff",
    color: "#172b27",
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 9,
  },
  activityButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#36705d",
    borderRadius: 7,
  },
  activityButtonText: { color: "#fff", fontWeight: "800" },
  actionCall: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionCallText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  actionWa: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionWaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
  },
  featuresList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  featureCheck: {
    color: "#16a34a",
    fontWeight: "700",
  },
  featureName: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "500",
  },
});
