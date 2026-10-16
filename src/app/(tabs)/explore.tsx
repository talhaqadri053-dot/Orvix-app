import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  fetchCategories,
  fetchCities,
  fetchSubCategories,
  searchListings,
} from "../../api/marketplaceService";
import ListingCard from "../../components/listing-card";
import ListingDetailModal from "../../components/listing-detail-modal";
import { BottomTabInset } from "../../constants/theme";

export default function ExploreScreen() {
  const { search: searchParam } = useLocalSearchParams<{ search?: string }>();
  const initialSearch = Array.isArray(searchParam)
    ? searchParam[0]
    : searchParam || "";
  const [search, setSearch] = useState(initialSearch);
  const [appliedFilters, setAppliedFilters] = useState({
    search: initialSearch,
    categoryId: null,
    subCategoryId: null,
    cityId: null,
    minPrice: "",
    maxPrice: "",
    sort: "newest",
  });
  const [cities, setCities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<any>(null);
  const [selectedSort, setSelectedSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [error, setError] = useState("");

  // Modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<any>(null);

  const loadListings = useCallback(
    async (page = 1, append = false) => {
      if (append) setLoadingMore(true);
      else if (page === 1 && refreshing) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const res = await searchListings({
          search: appliedFilters.search,
          category_id: appliedFilters.categoryId,
          sub_category_id: appliedFilters.subCategoryId,
          city_id: appliedFilters.cityId,
          min_price: appliedFilters.minPrice,
          max_price: appliedFilters.maxPrice,
          sort: appliedFilters.sort,
          page,
          per_page: 20,
        });
        const nextListings = res?.data || [];
        setListings((current) => {
          if (!append) return nextListings;
          const existingIds = new Set(
            current.map((listing: any) => listing.id),
          );
          return [
            ...current,
            ...nextListings.filter(
              (listing: any) => !existingIds.has(listing.id),
            ),
          ];
        });
        setPagination(res?.pagination || null);
      } catch (requestError: any) {
        setError(requestError?.message || "Unable to load search results.");
        if (!append) setListings([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [appliedFilters, refreshing],
  );

  // Load cities
  useEffect(() => {
    fetchCities()
      .then((data) => setCities(data || []))
      .catch((err) => {
        console.warn("Failed to load cities", err);
      });
  }, []);

  useEffect(() => {
    fetchCategories()
      .then((categoryData) => setCategories(categoryData || []))
      .catch(() => setCategories([]));
  }, []);

  // Load listings
  useEffect(() => {
    loadListings();
  }, [loadListings]);

  useEffect(() => {
    if (!selectedCategory) {
      setSubCategories([]);
      return;
    }
    fetchSubCategories(selectedCategory)
      .then((data) => setSubCategories(data || []))
      .catch(() => setSubCategories([]));
  }, [selectedCategory]);

  // Open listing detail
  const openDetail = (item: any) => {
    setSelectedListingId(item.id);
    setDetailVisible(true);
  };

  const applyFilters = () => {
    const minimum = minPrice.trim();
    const maximum = maxPrice.trim();
    if (
      (minimum && Number.isNaN(Number(minimum))) ||
      (maximum && Number.isNaN(Number(maximum)))
    ) {
      setError("Price filters must be numeric.");
      return;
    }
    if (minimum && maximum && Number(minimum) > Number(maximum)) {
      setError("Minimum price cannot be greater than maximum price.");
      return;
    }
    setAppliedFilters({
      search: search.trim(),
      categoryId: selectedCategory,
      subCategoryId: selectedSubCategory,
      cityId: selectedCity,
      minPrice: minimum,
      maxPrice: maximum,
      sort: selectedSort,
    });
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setSelectedCity(null);
    setSelectedSort("newest");
    setMinPrice("");
    setMaxPrice("");
    setAppliedFilters({
      search: "",
      categoryId: null,
      subCategoryId: null,
      cityId: null,
      minPrice: "",
      maxPrice: "",
      sort: "newest",
    });
  };

  const loadMore = () => {
    if (!loadingMore && pagination?.has_more) {
      loadListings((pagination.current_page || 1) + 1, true);
    }
  };

  const handleCategoryChange = (categoryId: any) => {
    setSelectedCategory(categoryId);
    setSelectedSubCategory(null);
  };

  const sortOptions = [
    { label: "Newest", value: "newest" },
    { label: "Popular", value: "popular" },
    { label: "Price: Low-High", value: "price_low_to_high" },
    { label: "Price: High-Low", value: "price_high_to_low" },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TextInput
          style={styles.input}
          placeholder="Search all items and properties..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={applyFilters}
          returnKeyType="search"
        />

        {search.length > 0 && (
          <Pressable
            onPress={() => {
              setSearch("");
              setAppliedFilters((current) => ({ ...current, search: "" }));
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>X</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: BottomTabInset + 40,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadListings(1)}
            colors={["#1d4ed8"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Sort Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {sortOptions.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setSelectedSort(opt.value)}
              style={[
                styles.filterChip,
                selectedSort === opt.value && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedSort === opt.value && styles.filterChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {categories.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityScroll}
            >
              <Pressable
                onPress={() => handleCategoryChange(null)}
                style={[
                  styles.cityChip,
                  !selectedCategory && styles.cityChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.cityChipText,
                    !selectedCategory && styles.cityChipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => handleCategoryChange(category.id)}
                  style={[
                    styles.cityChip,
                    selectedCategory === category.id && styles.cityChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      selectedCategory === category.id &&
                        styles.cityChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {subCategories.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Subcategory</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityScroll}
            >
              <Pressable
                onPress={() => setSelectedSubCategory(null)}
                style={[
                  styles.cityChip,
                  !selectedSubCategory && styles.cityChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.cityChipText,
                    !selectedSubCategory && styles.cityChipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>
              {subCategories.map((subcategory) => (
                <Pressable
                  key={subcategory.id}
                  onPress={() => setSelectedSubCategory(subcategory.id)}
                  style={[
                    styles.cityChip,
                    selectedSubCategory === subcategory.id &&
                      styles.cityChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      selectedSubCategory === subcategory.id &&
                        styles.cityChipTextActive,
                    ]}
                  >
                    {subcategory.name || subcategory.slug}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Cities Filter */}
        {cities.length > 0 && (
          <View style={styles.citySection}>
            <Text style={styles.cityTitle}>Filter by City</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityScroll}
            >
              <Pressable
                onPress={() => setSelectedCity(null)}
                style={[
                  styles.cityChip,
                  selectedCity === null && styles.cityChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.cityChipText,
                    selectedCity === null && styles.cityChipTextActive,
                  ]}
                >
                  All cities
                </Text>
              </Pressable>

              {cities.map((city) => (
                <Pressable
                  key={city.id}
                  onPress={() =>
                    setSelectedCity(selectedCity === city.id ? null : city.id)
                  }
                  style={[
                    styles.cityChip,
                    selectedCity === city.id && styles.cityChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      selectedCity === city.id && styles.cityChipTextActive,
                    ]}
                  >
                    {city.name}{" "}
                    {city.total_listings > 0 ? `(${city.total_listings})` : ""}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.priceSection}>
          <Text style={styles.filterTitle}>Price range</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              placeholder="Minimum"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={minPrice}
              onChangeText={setMinPrice}
            />
            <TextInput
              style={styles.priceInput}
              placeholder="Maximum"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={applyFilters} style={styles.applyButton}>
            <Text style={styles.applyText}>Apply filters</Text>
          </Pressable>
          <Pressable onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        {/* Results List */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsHeading}>Search Results</Text>

          <Text style={styles.resultsCount}>
            {listings.length} {listings.length === 1 ? "item" : "items"}
          </Text>
        </View>

        {error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{error}</Text>
            <Pressable
              onPress={() => loadListings(1)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : loading && !refreshing ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#1d4ed8" />
          </View>
        ) : listings.length > 0 ? (
          <View style={styles.listingsContainer}>
            {listings.map((item) => (
              <ListingCard key={item.id} listing={item} onPress={openDetail} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔍</Text>

            <Text style={styles.emptyTitle}>No ads found</Text>

            <Text style={styles.emptyText}>
              We couldn't find anything matching your filters. Try selecting
              another city or clearing your search.
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
              <Text style={styles.loadMoreText}>Load more results</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Detail Modal */}
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
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#dbe4f0",
    position: "relative",
  },
  input: {
    flex: 1,
    minHeight: 48,
    backgroundColor: "#edf2f9",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
  },
  clearBtn: {
    position: "absolute",
    right: 26,
    padding: 6,
  },
  clearBtnText: {
    color: "#64748b",
    fontWeight: "700",
    fontSize: 14,
  },
  scrollContent: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingTop: 16,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd9d0",
  },
  filterChipActive: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#334155",
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  citySection: {
    marginTop: 8,
  },
  filterSection: {
    marginTop: 10,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    paddingHorizontal: 16,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceSection: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  priceRow: {
    flexDirection: "row",
    gap: 8,
  },
  priceInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderColor: "#cbd9d0",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  applyButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  applyText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  resetButton: {
    borderColor: "#cbd9d0",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  resetText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 13,
  },
  cityTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    paddingHorizontal: 16,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cityScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  cityChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cityChipActive: {
    backgroundColor: "#60a5fa",
    borderColor: "#60a5fa",
  },
  cityChipText: {
    fontSize: 11,
    color: "#475569",
  },
  cityChipTextActive: {
    color: "#111827",
    fontWeight: "700",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  resultsHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  resultsCount: {
    fontSize: 12,
    color: "#64748b",
  },
  listingsContainer: {
    paddingHorizontal: 16,
  },
  loader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 28,
    marginHorizontal: 16,
    marginTop: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
  },
  emptyText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
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
