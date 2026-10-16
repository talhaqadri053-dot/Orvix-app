import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    fetchCategories,
    getCategorySubCategories,
} from "../../api/categories";
import { fetchListings } from "../../api/listings";
import ListingCard from "../../components/listing-card";
import ListingDetailModal from "../../components/listing-detail-modal";
import { BottomTabInset } from "../../constants/theme";

export default function CategoryScreen() {
  const router = useRouter();
  const { id, subCategoryId } = useLocalSearchParams<{
    id?: string;
    subCategoryId?: string;
  }>();
  const categoryParam = Array.isArray(id) ? id[0] : id || "all";
  const subCategoryParam = Array.isArray(subCategoryId)
    ? subCategoryId[0]
    : subCategoryId;

  const [categories, setCategories] = useState<any[]>([]);
  const [categoryListings, setCategoryListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [selectedListingId, setSelectedListingId] = useState<
    number | string | null
  >(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const selectedCategory = useMemo(() => {
    if (categoryParam === "all") return null;
    return (
      categories.find(
        (category) => String(category.id) === String(categoryParam),
      ) || null
    );
  }, [categories, categoryParam]);

  const selectedSubCategory = useMemo(
    () =>
      subCategories.find(
        (subCategory) => String(subCategory.id) === String(subCategoryParam),
      ) || null,
    [subCategories, subCategoryParam],
  );

  const loadListings = useCallback(
    async (page = 1, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");

      try {
        const allCategories = await fetchCategories();
        setCategories(allCategories || []);
        const category = allCategories?.find(
          (item) => String(item.id) === String(categoryParam),
        );
        setSubCategories(getCategorySubCategories(category));

        const listingsResponse = await fetchListings({
          page,
          per_page: 20,
          ...(categoryParam !== "all"
            ? { category_id: Number(categoryParam) }
            : {}),
          ...(subCategoryParam
            ? { sub_category_id: Number(subCategoryParam) }
            : {}),
        });

        const nextListings = listingsResponse?.data || [];
        setCategoryListings((current) => {
          if (!append) return nextListings;
          const existingIds = new Set(current.map((listing) => listing.id));
          return [
            ...current,
            ...nextListings.filter((listing) => !existingIds.has(listing.id)),
          ];
        });
        setPagination(listingsResponse?.pagination || null);
      } catch (requestError) {
        setError(
          requestError?.message || "Unable to load categories and listings.",
        );
        if (!append) setCategoryListings([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [categoryParam, subCategoryParam],
  );

  useEffect(() => {
    setLoading(true);
    loadListings();
  }, [loadListings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadListings(1);
  };

  const selectSubCategory = (subCategory: any) => {
    router.push({
      pathname: "/category/[id]",
      params: {
        id: String(categoryParam),
        subCategoryId: String(subCategory.id),
      },
    });
  };

  const loadMore = () => {
    if (
      !loadingMore &&
      pagination?.has_more &&
      pagination.current_page < pagination.last_page
    ) {
      loadListings(pagination.current_page + 1, true);
    }
  };

  const openListingDetail = (listing: any) => {
    setSelectedListingId(listing.id);
    setDetailVisible(true);
  };

  const title =
    selectedSubCategory?.name ||
    selectedCategory?.name ||
    "Browse all categories";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: BottomTabInset + 32 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1d4ed8"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.categoryTabsWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabs}
          >
            <Pressable
              onPress={() => router.push("/category/all")}
              style={[
                styles.tabChip,
                categoryParam === "all" && styles.tabChipActive,
              ]}
            >
              <Text
                style={[
                  styles.tabChipText,
                  categoryParam === "all" && styles.tabChipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>

            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() =>
                  router.push({
                    pathname: "/category/[id]",
                    params: { id: String(category.id) },
                  })
                }
                style={[
                  styles.tabChip,
                  String(category.id) === String(categoryParam) &&
                    styles.tabChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    String(category.id) === String(categoryParam) &&
                      styles.tabChipTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {selectedCategory && subCategories.length > 0 ? (
          <View style={styles.subCategorySection}>
            <Text style={styles.subCategoryHeading}>Subcategories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryTabs}
            >
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/category/[id]",
                    params: { id: String(categoryParam) },
                  })
                }
                style={[
                  styles.tabChip,
                  !subCategoryParam && styles.tabChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    !subCategoryParam && styles.tabChipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {subCategories.map((subCategory) => (
                <Pressable
                  key={subCategory.id}
                  onPress={() => selectSubCategory(subCategory)}
                  style={[
                    styles.tabChip,
                    String(subCategory.id) === String(subCategoryParam) &&
                      styles.tabChipActive,
                  ]}
                >
                  {subCategory.icon_url ? (
                    <Image
                      source={{ uri: subCategory.icon_url }}
                      style={styles.subCategoryIcon}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.tabChipText,
                      String(subCategory.id) === String(subCategoryParam) &&
                        styles.tabChipTextActive,
                    ]}
                  >
                    {subCategory.name || subCategory.slug}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{title}</Text>
          <Text style={styles.summaryText}>
            {categoryListings.length}{" "}
            {categoryListings.length === 1 ? "listing" : "listings"} available
          </Text>
        </View>

        {error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{error}</Text>
            <Pressable
              onPress={() => loadListings(1)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#1d4ed8" />
          </View>
        ) : categoryListings.length > 0 ? (
          categoryListings.map((listing: any) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onPress={openListingDetail}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No listings in this category yet
            </Text>
            <Text style={styles.emptyText}>
              Try another category or browse all current ads.
            </Text>
          </View>
        )}
        {!error && !loading && pagination?.has_more ? (
          <Pressable
            onPress={loadMore}
            disabled={loadingMore}
            style={styles.loadMoreButton}
          >
            {loadingMore ? (
              <ActivityIndicator color="#1d4ed8" />
            ) : (
              <Text style={styles.loadMoreText}>Load more listings</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>

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
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#dbe4f0",
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 10,
  },
  backButtonText: {
    color: "#1d4ed8",
    fontSize: 15,
    fontWeight: "700",
  },
  headerTitle: {
    flex: 1,
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginRight: 42,
  },
  content: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    padding: 20,
  },
  categoryTabsWrap: {
    marginBottom: 14,
  },
  categoryTabs: {
    paddingRight: 8,
    gap: 10,
  },
  tabChip: {
    backgroundColor: "#e8eff9",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabChipActive: {
    backgroundColor: "#dbeafe",
    borderWidth: 1,
    borderColor: "#6ee7b7",
  },
  tabChipText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  tabChipTextActive: {
    color: "#111827",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dbe4f0",
    marginBottom: 14,
  },
  summaryTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
  },
  summaryText: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 13,
  },
  loaderContainer: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 28,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
  },
  subCategorySection: {
    marginBottom: 14,
  },
  subCategoryHeading: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  subCategoryIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  retryButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 12,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
  },
  loadMoreButton: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#bfdbfe",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    paddingVertical: 12,
  },
  loadMoreText: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
});
