import { useFocusEffect, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import logo from "../../../assets/images/orvix.png";
import { fetchHomepage, searchListings } from "../../api/marketplaceService";
import ListingCard from "../../components/listing-card";
import ListingDetailModal from "../../components/listing-detail-modal";
import { BottomTabInset } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [featuredListings, setFeaturedListings] = useState<any[]>([]);
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [sliders, setSliders] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>(
    {},
  );

  // Detail Modal state
  const [selectedListingId, setSelectedListingId] = useState<
    number | string | null
  >(null);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  const normalizeArray = (value: any) =>
    Array.isArray(value) ? value : [];

  const loadData = useCallback(async () => {
    const results = await Promise.allSettled([
      fetchHomepage(),
      searchListings({ per_page: 10 }),
    ]);
    const [homepageResult, recentResult] = results;
    const errors: Record<string, string> = {};

    if (homepageResult.status === "fulfilled") {
      const homepage = homepageResult.value ?? {};
      setCategories(normalizeArray(homepage.categories));
      setSliders(normalizeArray(homepage.sliders));
      setTestimonials(normalizeArray(homepage.testimonials));
      setFeaturedListings(normalizeArray(homepage.featured_listings));
    } else {
      const message = homepageResult.reason?.message || "Unable to load homepage content.";
      errors.homepage = message;
      setCategories([]);
      setSliders([]);
      setTestimonials([]);
      setFeaturedListings([]);
    }
    if (recentResult.status === "fulfilled") {
      const payload = recentResult.value ?? {};
      setRecentListings(normalizeArray(payload.data));
    } else {
      errors.recent =
        recentResult.reason?.message || "Unable to load the latest listings.";
    }

    setSectionErrors(errors);
    setLoading(false);
    setIsRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleCategorySelect = async (catId: number | null) => {
    const normalizedId = catId == null ? null : Number(catId);
    if (catId !== null && Number.isNaN(normalizedId)) {
      return;
    }

    const newCat = selectedCategory === normalizedId ? null : normalizedId;
    setSelectedCategory(newCat);
    setLoading(true);
    setSectionErrors((current) => ({ ...current, recent: "" }));
    try {
      const params: Record<string, any> = { per_page: 10 };
      if (newCat !== null) params.category_id = newCat;
      const res = await searchListings(params);
      const nextListings = Array.isArray(res?.data) ? res.data : [];
      setRecentListings(nextListings);
    } catch (err) {
      setSectionErrors((current) => ({
        ...current,
        recent: "Unable to filter listings. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    router.push(
      query ? { pathname: "/explore", params: { search: query } } : "/explore",
    );
  };

  const openListingDetail = (listing: any) => {
    setSelectedListingId(listing.id);
    setDetailVisible(true);
  };

  const handleLogout = () => {
    setMenuVisible(false);
    logout();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={logo}
            style={{ width: 60, height: 25, resizeMode: "contain" }}
          />
          <Text style={styles.userGreeting}>
            Hi,{" "}
            {(user as any)?.name
              ? (user as any).name.split(" ")[0]
              : "Explorer"}{" "}
            👋
          </Text>
        </View>

        <Pressable
          onPress={() => setMenuVisible((prev) => !prev)}
          style={styles.menuButton}
          hitSlop={8}
        >
          <Text style={styles.menuButtonText}>⋮</Text>
        </Pressable>

        {menuVisible && (
          <>
            {/* Backdrop */}
            <Pressable
              style={styles.menuBackdrop}
              onPress={() => setMenuVisible(false)}
            />
            <View style={styles.menuContainer}>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  router.push("/account/create-listing");
                }}
              >
                <Text style={styles.menuItemText}>Create Post</Text>
              </Pressable>
              <View style={styles.menuDivider} />
              {user ? (
                <Pressable style={styles.menuItem} onPress={handleLogout}>
                  <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                    Logout
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push("/login");
                  }}
                >
                  <Text style={styles.menuItemText}>Sign In</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: BottomTabInset + 90 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={["#1d4ed8"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search phones, properties, electronics..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable onPress={handleSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        {sectionErrors.homepage ? (
          <View style={styles.sectionErrorBox}>
            <Text style={styles.sectionError}>{sectionErrors.homepage}</Text>
            <Pressable onPress={onRefresh} style={styles.retryButton} disabled={isRefreshing}>
              <Text style={styles.retryText}>{isRefreshing ? "Loading..." : "Retry"}</Text>
            </Pressable>
          </View>
        ) : null}

        {sliders.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sliderContent}>
            {sliders.map((slider: any) => (
              <View key={slider.id} style={styles.sliderCard}>
                {slider.image_url ? (
                  <ExpoImage source={{ uri: slider.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
                ) : null}
                <View style={styles.sliderCopy}>
                  {slider.small_text ? <Text style={styles.sliderEyebrow}>{slider.small_text}</Text> : null}
                  <Text style={styles.sliderTitle} numberOfLines={2}>{slider.title || "Discover what's nearby"}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Categories Bar */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <Pressable onPress={() => router.push("/category/all")}>
            <Text style={styles.sectionSubtitle}>Browse all</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          <Pressable
            onPress={() => handleCategorySelect(null)}
            style={[
              styles.categoryChip,
              selectedCategory === null && styles.categoryChipActive,
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === null && styles.categoryChipTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>
          {categories.map((cat: any) => (
            <Pressable
              key={cat.id}
              onPress={() => handleCategorySelect(cat.id)}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {sectionErrors.categories ? (
          <View style={styles.sectionErrorBox}>
            <Text style={styles.sectionError}>{sectionErrors.categories}</Text>
            <Pressable
              onPress={onRefresh}
              style={styles.retryButton}
              disabled={isRefreshing}
            >
              <Text style={styles.retryText}>
                {isRefreshing ? "Loading..." : "Retry"}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {!loading && !sectionErrors.homepage && !sectionErrors.categories && categories.length === 0 ? (
          <Text style={styles.sectionEmpty}>No categories available.</Text>
        ) : null}

        {/* Featured Listings Carousel */}
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Ads</Text>
            <Text style={styles.sectionSubtitle}>Handpicked deals</Text>
          </View>
          {sectionErrors.featured ? (
            <View style={styles.sectionErrorBox}>
              <Text style={styles.sectionError}>{sectionErrors.featured}</Text>
              <Pressable
                onPress={onRefresh}
                style={styles.retryButton}
                disabled={isRefreshing}
              >
                <Text style={styles.retryText}>
                  {isRefreshing ? "Loading..." : "Retry"}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {!sectionErrors.homepage && !sectionErrors.featured && featuredListings.length === 0 ? (
            <Text style={styles.sectionEmpty}>
              No featured listings available.
            </Text>
          ) : null}
          {featuredListings.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredListings.map((listing: any) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  horizontal
                  onPress={openListingDetail}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Recent Listings Feed */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory ? "Filtered Listings" : "Recent Listings"}
            </Text>
            <Text style={styles.resultsCount}>
              {recentListings.length}{" "}
              {recentListings.length === 1 ? "ad" : "ads"}
            </Text>
          </View>

          {loading && !isRefreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#1d4ed8" />
            </View>
          ) : sectionErrors.recent ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{sectionErrors.recent}</Text>
              <Pressable
                onPress={onRefresh}
                style={styles.retryButton}
                disabled={isRefreshing}
              >
                <Text style={styles.retryText}>
                  {isRefreshing ? "Loading..." : "Retry"}
                </Text>
              </Pressable>
            </View>
          ) : recentListings.length > 0 ? (
            recentListings.map((listing: any) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={openListingDetail}
              />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.emptySub}>
                Try searching for something else or reset filters.
              </Text>
            </View>
          )}
        </View>

        {testimonials.length > 0 && (
          <View style={styles.testimonialSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Community voices</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testimonialContent}>
              {testimonials.map((testimonial: any) => (
                <View key={testimonial.id} style={styles.testimonialItem}>
                  <Text style={styles.testimonialComment} numberOfLines={4}>{testimonial.comment}</Text>
                  <View style={styles.testimonialAuthor}>
                    {testimonial.image_url ? (
                      <ExpoImage source={{ uri: testimonial.image_url }} style={styles.testimonialImage} contentFit="cover" />
                    ) : null}
                    <View style={styles.testimonialNameWrap}>
                      <Text style={styles.testimonialName} numberOfLines={1}>{testimonial.name}</Text>
                      <Text style={styles.testimonialDesignation} numberOfLines={1}>{testimonial.designation}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Listing Detail Sheet */}
      <ListingDetailModal
        visible={detailVisible}
        listingId={selectedListingId}
        onClose={() => setDetailVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f7fc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#dbe4f0",
    zIndex: 1000,
    position: "relative",
  },
  headerLeft: {
    flexDirection: "column",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1d4ed8",
    letterSpacing: 1,
  },
  userGreeting: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingTop: 18,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#fff",
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#cbd9d0",
    color: "#111827",
  },
  searchButton: {
    backgroundColor: "#1d4ed8",
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  resultsCount: {
    fontSize: 12,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 6,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryChipActive: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  categoryChipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  featuredSection: {
    marginTop: 14,
  },
  sliderContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  sliderCard: {
    width: 300,
    height: 154,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#245b4d",
    justifyContent: "flex-end",
  },
  sliderCopy: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(10, 22, 20, 0.48)",
  },
  sliderEyebrow: {
    color: "#d1fae5",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sliderTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
  },
  featuredScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  recentSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  testimonialSection: {
    marginTop: 18,
    marginBottom: 8,
  },
  testimonialContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  testimonialItem: {
    width: 286,
    minHeight: 142,
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d9e4df",
    backgroundColor: "#fff",
  },
  testimonialComment: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
  },
  testimonialAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 14,
  },
  testimonialImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e2e8f0",
  },
  testimonialNameWrap: {
    flex: 1,
  },
  testimonialName: {
    color: "#172b27",
    fontSize: 12,
    fontWeight: "700",
  },
  testimonialDesignation: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  loaderContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  emptySub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
  sectionError: {
    color: "#b91c1c",
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionErrorBox: {
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  sectionEmpty: {
    color: "#64748b",
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
  },
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#1d4ed8",
    borderRadius: 6,
  },
  menuButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    lineHeight: 18,
  },
  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: -1000,
    right: -1000,
    bottom: -2000,
    zIndex: 998,
  },
  menuContainer: {
    position: "absolute",
    top: 60,
    right: 16,
    minWidth: 180,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 2,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuItemText: {
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "600",
  },
  menuItemDanger: {
    color: "#ef4444",
  },
});
