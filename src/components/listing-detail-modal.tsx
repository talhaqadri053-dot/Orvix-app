import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { fetchListingDetail } from "../api/listings";
import { checkWishlist, toggleWishlist } from "../api/wishlist";
import { useAuth } from "../hooks/useAuth";
import ListingReviews from "./listing-reviews";
import ReportListingModal from "./report-listing-modal";

interface ListingDetailModalProps {
  visible: boolean;
  listingId: number | string | null;
  onClose: () => void;
  onWishlistChange?: (isFavorited: boolean, listingId: number | string) => void;
}

// ---------------------------------------------------------------------------
// DEBUG SWITCH
// Set this to true to print the raw API payload to the console the moment a
// listing loads. Turn it back off once everything is showing correctly.
// ---------------------------------------------------------------------------
const DEBUG_LOG_RAW_RESPONSE = true;

// ---------------------------------------------------------------------------
// Normalization layer
// Different backends name the same field differently (price vs
// regular_price vs display_price, thumb_image_url vs image vs cover_image,
// etc). Instead of assuming one exact shape, we probe a list of common
// candidate keys for each field and use the first one that has a value.
// This makes the component resilient to whatever your API actually returns.
// ---------------------------------------------------------------------------

function pick(obj: any, keys: string[]): any {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = key
      .split(".")
      .reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function pickArray(obj: any, keys: string[]): any[] {
  const value = pick(obj, keys);
  if (Array.isArray(value)) return value;
  return [];
}

function normalizeImageUrl(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  // some APIs return objects like { url }, { image_url }, { path }
  return val.url || val.image_url || val.path || val.src || null;
}

function normalizeGalleries(
  listing: any,
): { id: string | number; image_url: string }[] {
  const rawList = pickArray(listing, [
    "galleries",
    "gallery",
    "images",
    "photos",
    "media",
  ]);
  return rawList
    .map((item: any, idx: number) => {
      if (typeof item === "string") {
        return { id: idx, image_url: item };
      }
      const url = normalizeImageUrl(
        item?.image_url || item?.url || item?.image || item?.path || item,
      );
      return { id: item?.id ?? idx, image_url: url };
    })
    .filter((g: any) => !!g.image_url);
}

function normalizeAgent(listing: any): any {
  const rawAgent = pick(listing, [
    "agent",
    "seller",
    "user",
    "owner",
    "author",
    "poster",
  ]);
  if (!rawAgent || typeof rawAgent !== "object") return null;
  return {
    id: pick(rawAgent, ["id"]),
    name: pick(rawAgent, ["name", "full_name", "username"]),
    email: pick(rawAgent, ["email"]),
    avatar_url: normalizeImageUrl(
      pick(rawAgent, [
        "avatar_url",
        "avatar",
        "photo",
        "profile_image",
        "image",
      ]),
    ),
    phone: pick(rawAgent, ["phone", "mobile", "contact_phone", "phone_number"]),
    whatsapp_phone: pick(rawAgent, [
      "whatsapp_phone",
      "whatsapp",
      "whatsapp_number",
    ]),
  };
}

function normalizeNamed(val: any): { name: string } | null {
  if (!val) return null;
  if (typeof val === "string") return { name: val };
  if (typeof val === "object" && (val.name || val.title))
    return { name: val.name || val.title };
  return null;
}

type SpecEntry = { key: string; label: string; value: string };

function formatLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSpecValue(value: any): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === true) return "Yes";
  if (value === false) return "No";
  return value != null ? String(value) : "";
}

function getSpecEntries(listing: any): SpecEntry[] {
  const raw = pick(listing, [
    "attributes",
    "custom_fields",
    "dynamic_attributes",
    "specifications",
    "fields",
  ]);
  if (!raw) return [];

  let entries: SpecEntry[] = [];
  if (Array.isArray(raw)) {
    entries = raw.map((item: any) => ({
      key: String(item.key ?? item.name ?? ""),
      label: String(item.label ?? item.name ?? item.key ?? ""),
      value: formatSpecValue(item.value),
    }));
  } else if (typeof raw === "object") {
    entries = Object.entries(raw).map(([key, value]) => ({
      key,
      label: formatLabel(key),
      value: formatSpecValue(value),
    }));
  }
  return entries.filter((e) => e.key && e.value !== "");
}

function normalizeListing(raw: any) {
  if (!raw) return null;

  const title = pick(raw, ["title", "name", "listing_title"]) || "";
  const description =
    pick(raw, ["description", "desc", "details", "body"]) || "";

  const priceRaw = pick(raw, [
    "display_price",
    "formatted_price",
    "price",
    "regular_price",
    "amount",
  ]);
  const display_price =
    priceRaw != null && typeof priceRaw !== "string"
      ? `PKR ${Number(priceRaw).toLocaleString()}`
      : priceRaw || "Price on request";

  const thumb_image_url = normalizeImageUrl(
    pick(raw, [
      "thumb_image_url",
      "thumb_image",
      "thumbnail",
      "cover_image",
      "image_url",
      "image",
      "main_image",
    ]),
  );

  const galleries = normalizeGalleries(raw);

  const city = normalizeNamed(pick(raw, ["city", "location", "city_name"]));
  const address = pick(raw, ["address", "full_address", "street_address"]);

  const category = normalizeNamed(pick(raw, ["category"]));
  const sub_category = normalizeNamed(
    pick(raw, ["sub_category", "subcategory"]),
  );
  const child_category = normalizeNamed(
    pick(raw, ["child_category", "childcategory"]),
  );

  const views = pick(raw, ["views", "view_count", "views_count"]) ?? 0;
  const formatted_date = pick(raw, [
    "formatted_date",
    "created_at",
    "posted_at",
    "date",
  ]);

  const average_rating = pick(raw, ["average_rating", "rating"]) ?? 0;
  const reviews_count = pick(raw, ["reviews_count", "review_count"]) ?? 0;
  const reviews = pickArray(raw, ["reviews"]);

  const is_featured = Boolean(pick(raw, ["is_featured", "featured"]));

  const features = pickArray(raw, ["features", "amenities"]).map(
    (f: any, idx: number) =>
      typeof f === "string"
        ? { id: idx, name: f }
        : { id: f.id ?? idx, name: f.name ?? f.label ?? String(f) },
  );

  const agent = normalizeAgent(raw);

  // These are the listing's OWN contact fields, submitted on the create
  // form ("Mobile Phone Number", "WhatsApp Number") — distinct from the
  // seller's profile phone under `agent`. Prefer these for the call/
  // WhatsApp buttons since they're what the seller entered for this
  // specific listing.
  const listing_phone = pick(raw, ["phone", "contact_phone"]);
  const listing_whatsapp = pick(raw, ["whatsapp_number", "whatsapp"]);
  const show_phone = pick(raw, ["show_phone"]);

  return {
    raw,
    title,
    description,
    display_price,
    thumb_image_url,
    galleries,
    city,
    address,
    category,
    sub_category,
    child_category,
    views,
    formatted_date,
    average_rating,
    reviews_count,
    reviews,
    is_featured,
    features,
    agent,
    listing_phone,
    listing_whatsapp,
    show_phone,
    specEntries: getSpecEntries(raw),
  };
}

export default function ListingDetailModal({
  visible,
  listingId,
  onClose,
  onWishlistChange,
}: ListingDetailModalProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [favLoading, setFavLoading] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [reloadToken, setReloadToken] = useState(0);
  const [reportVisible, setReportVisible] = useState(false);

  useEffect(() => {
    if (!visible || !listingId) return;

    let isMounted = true;
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
        if (isMounted) {
          if (DEBUG_LOG_RAW_RESPONSE) {
            // eslint-disable-next-line no-console
            console.log(
              "LISTING DETAIL RAW RESPONSE:",
              JSON.stringify(detail, null, 2),
            );
          }
          const normalized = normalizeListing(detail);
          setListing(normalized);
          setSelectedImage(normalized?.thumb_image_url || null);
          setImageError(false);
          setIsFavorited(Boolean(fav));
        }
      })
      .catch((err) => {
        if (isMounted)
          setError(err?.message || "Unable to load listing details.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, listingId, reloadToken, isAuthenticated]);

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
      onWishlistChange?.(Boolean(res?.is_favorited), listingId);
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
    const phone =
      listing?.listing_phone ||
      listing?.agent?.phone ||
      listing?.agent?.whatsapp_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleWhatsApp = () => {
    const phone =
      listing?.listing_whatsapp ||
      listing?.agent?.whatsapp_phone ||
      listing?.agent?.phone;
    if (phone) {
      const cleanPhone = String(phone).replace(/[^0-9]/g, "");
      const text = encodeURIComponent(
        `Hi, I am interested in your listing: "${listing?.title}" on Orvix.`,
      );
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕ Close</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {listing?.title || "Listing Details"}
          </Text>
          <Pressable
            onPress={handleToggleFav}
            disabled={favLoading}
            style={[styles.favButton, isFavorited && styles.favButtonActive]}
          >
            <Text style={styles.favButtonText}>{isFavorited ? "♥" : "♡"}</Text>
          </Pressable>
          <Pressable
            onPress={() => setReportVisible(true)}
            style={styles.reportButton}
          >
            <Text style={styles.reportButtonText}>Report</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1d4ed8" />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable
              onPress={() => setReloadToken((current) => current + 1)}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : listing ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Main Image */}
            <View style={styles.imageContainer}>
              {selectedImage && !imageError ? (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.heroImage}
                  contentFit="cover"
                  transition={200}
                  onError={() => setImageError(true)}
                />
              ) : (
                <Text style={styles.noImageText}>No image available</Text>
              )}
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>
                  {listing.display_price}
                </Text>
              </View>
              {listing.is_featured && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>★ FEATURED</Text>
                </View>
              )}
            </View>

            {/* Gallery Thumbnails */}
            {(listing.galleries?.length ?? 0) > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.galleryScroll}
                contentContainerStyle={styles.galleryContent}
              >
                {listing.thumb_image_url && (
                  <Pressable
                    onPress={() => selectImage(listing.thumb_image_url || null)}
                    style={[
                      styles.thumbWrapper,
                      selectedImage === listing.thumb_image_url &&
                        styles.thumbWrapperActive,
                    ]}
                  >
                    <Image
                      source={{ uri: listing.thumb_image_url }}
                      style={styles.galleryThumb}
                      contentFit="cover"
                    />
                  </Pressable>
                )}
                {listing.galleries.map((gal: any) => (
                  <Pressable
                    key={gal.id}
                    onPress={() => selectImage(gal.image_url || null)}
                    style={[
                      styles.thumbWrapper,
                      selectedImage === gal.image_url &&
                        styles.thumbWrapperActive,
                    ]}
                  >
                    {gal.image_url ? (
                      <Image
                        source={{ uri: gal.image_url }}
                        style={styles.galleryThumb}
                        contentFit="cover"
                      />
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* Details Section */}
            <View style={styles.body}>
              <Text style={styles.listingTitle}>{listing.title}</Text>

              {/* Location & Meta info */}
              <View style={styles.metaRow}>
                <Text style={styles.metaLocation}>
                  📍{" "}
                  {[listing.city?.name, listing.address]
                    .filter(Boolean)
                    .join(" • ") || "Location unavailable"}
                </Text>
                {listing.formatted_date ? (
                  <Text style={styles.metaDate}>
                    📅 {listing.formatted_date}
                  </Text>
                ) : null}
              </View>

              {/* Tags */}
              <View style={styles.tagRow}>
                {listing.category && (
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>
                      {listing.category.name}
                    </Text>
                  </View>
                )}
                {listing.sub_category && (
                  <View style={styles.subCategoryTag}>
                    <Text style={styles.subCategoryTagText}>
                      {listing.sub_category.name}
                    </Text>
                  </View>
                )}
                {listing.child_category && (
                  <View style={styles.subCategoryTag}>
                    <Text style={styles.subCategoryTagText}>
                      {listing.child_category.name}
                    </Text>
                  </View>
                )}
                <View style={styles.viewsTag}>
                  <Text style={styles.viewsTagText}>
                    👁 {listing.views} views
                  </Text>
                </View>
                {listing.reviews_count > 0 && (
                  <View style={styles.viewsTag}>
                    <Text style={styles.viewsTagText}>
                      ★ {listing.average_rating} ({listing.reviews_count})
                    </Text>
                  </View>
                )}
              </View>

              {/* Seller / Agent Card */}
              {listing.agent && (
                <View style={styles.agentCard}>
                  {listing.agent.avatar_url ? (
                    <Image
                      source={{ uri: listing.agent.avatar_url }}
                      style={styles.agentAvatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.agentAvatarPlaceholder}>
                      <Text style={styles.agentAvatarPlaceholderText}>?</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() =>
                      listing.agent.id &&
                      router.push({
                        pathname: "/seller/[identifier]",
                        params: { identifier: String(listing.agent.id) },
                      })
                    }
                    style={styles.agentInfo}
                  >
                    <Text style={styles.agentLabel}>POSTED BY SELLER</Text>
                    <Text style={styles.agentName}>
                      {listing.agent.name || "Seller"}
                    </Text>
                    {listing.agent.email ? (
                      <Text style={styles.agentEmail}>
                        {listing.agent.email}
                      </Text>
                    ) : null}
                  </Pressable>
                  <View style={styles.agentActions}>
                    <>
                      {(listing.listing_phone ||
                        listing.agent.phone ||
                        listing.agent.whatsapp_phone) && (
                        <Pressable
                          onPress={handleCall}
                          style={styles.callButton}
                        >
                          <Text style={styles.callButtonText}>📞 Call</Text>
                        </Pressable>
                      )}
                      {(listing.listing_whatsapp ||
                        listing.agent.whatsapp_phone ||
                        listing.agent.phone) && (
                        <Pressable
                          onPress={handleWhatsApp}
                          style={styles.whatsappButton}
                        >
                          <Text style={styles.whatsappButtonText}>
                            💬 WhatsApp
                          </Text>
                        </Pressable>
                      )}
                    </>
                  </View>
                </View>
              )}

              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Description</Text>
                <Text style={styles.descriptionText}>
                  {listing.description ||
                    "No description provided for this listing."}
                </Text>
              </View>

              {/* Category-specific attributes captured at post creation */}
              {(listing.specEntries?.length ?? 0) > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionHeading}>Specifications</Text>
                  <View style={styles.specGrid}>
                    {listing.specEntries.map((entry: SpecEntry) => (
                      <View key={entry.key} style={styles.specRow}>
                        <Text style={styles.specLabel}>{entry.label}</Text>
                        <Text style={styles.specValue}>{entry.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Features / Amenities */}
              {(listing.features?.length ?? 0) > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionHeading}>
                    Features & Amenities
                  </Text>
                  <View style={styles.featureGrid}>
                    {listing.features.map((feat: any) => (
                      <View key={feat.id} style={styles.featureChip}>
                        <Text style={styles.featureCheck}>✓</Text>
                        <Text style={styles.featureText}>{feat.name}</Text>
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
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Listing not found or expired.</Text>
          </View>
        )}
      </View>
      <ReportListingModal
        visible={reportVisible}
        listingId={listingId}
        onClose={() => setReportVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#edf2f9",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
    color: "#111827",
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#edf2f9",
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  favButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#edf2f9",
    borderRadius: 8,
  },
  favButtonActive: {
    backgroundColor: "#fee2e2",
  },
  favButtonText: {
    fontSize: 18,
    color: "#e11d48",
  },
  reportButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  reportButtonText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748b",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  noImageText: {
    color: "#64748b",
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 260,
    backgroundColor: "#f3f7fc",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  priceBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(16, 25, 21, 0.88)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceBadgeText: {
    color: "#60a5fa",
    fontSize: 18,
    fontWeight: "700",
  },
  featuredBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#b45309",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  galleryScroll: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  galleryContent: {
    gap: 8,
  },
  thumbWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbWrapperActive: {
    borderColor: "#1d4ed8",
  },
  galleryThumb: {
    width: "100%",
    height: "100%",
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  metaLocation: {
    fontSize: 13,
    color: "#64748b",
    flex: 1,
  },
  metaDate: {
    fontSize: 12,
    color: "#94a3b8",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  categoryTag: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryTagText: {
    color: "#1e40af",
    fontSize: 12,
    fontWeight: "600",
  },
  subCategoryTag: {
    backgroundColor: "#edf2f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subCategoryTagText: {
    color: "#475569",
    fontSize: 12,
  },
  viewsTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewsTagText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  agentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f7fc",
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e2e8f0",
  },
  agentAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  agentAvatarPlaceholderText: {
    color: "#64748b",
    fontWeight: "700",
  },
  agentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  agentLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.5,
  },
  agentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  agentEmail: {
    fontSize: 12,
    color: "#64748b",
  },
  agentActions: {
    flexDirection: "column",
    gap: 6,
  },
  callButton: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  callButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  whatsappButton: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  whatsappButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginTop: 24,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#334155",
  },
  specGrid: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f9",
    backgroundColor: "#fff",
  },
  specLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    flex: 1,
  },
  specValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featureChip: {
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
    fontSize: 13,
  },
  featureText: {
    fontSize: 13,
    color: "#166534",
    fontWeight: "500",
  },
});
