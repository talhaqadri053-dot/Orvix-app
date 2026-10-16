import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
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
    fetchBookings,
    fetchJobRequests,
    fetchReviews,
} from "../../api/account";
import { deleteListing, fetchMyListings } from "../../api/listings";
import { fetchKyc } from "../../api/sidebar";
import {
    createSupportTicket,
    fetchSupportTickets as fetchSupportTicketsPage,
} from "../../api/support";
import { fetchWishlist } from "../../api/wishlist";
import ListingCard from "../../components/listing-card";
import ListingDetailModal from "../../components/listing-detail-modal";

const titles: Record<string, string> = {
  bookings: "My bookings",
  "job-requests": "My job requests",
  reviews: "My reviews",
  "my-listings": "My listings",
  wishlist: "Wishlist",
  kyc: "KYC verification",
  support: "Support tickets",
};

export default function AccountSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<
    number | string | null
  >(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [myListingsPagination, setMyListingsPagination] = useState<any>(null);
  const [myListingsError, setMyListingsError] = useState("");
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [myListingsRefreshing, setMyListingsRefreshing] = useState(false);
  const [myListingsMoreLoading, setMyListingsMoreLoading] = useState(false);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [supportMeta, setSupportMeta] = useState<any>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportRefreshing, setSupportRefreshing] = useState(false);
  const [supportMoreLoading, setSupportMoreLoading] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [createSupportVisible, setCreateSupportVisible] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportPriority, setSupportPriority] = useState("normal");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<any | null>(null);
  const [isDeletingListing, setIsDeletingListing] = useState(false);
  const [deleteListingError, setDeleteListingError] = useState("");

  const loadWishlist = useCallback(
    async (page = 1, append = false) => {
      if (section !== "wishlist") return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const result = await fetchWishlist(page);
        const nextItems = result?.data || [];
        setItems((current) => {
          if (!append) return nextItems;
          const existingIds = new Set(
            current.map((item: any) => item.listing?.id).filter(Boolean),
          );
          return [
            ...current,
            ...nextItems.filter(
              (item: any) => !existingIds.has(item.listing?.id),
            ),
          ];
        });
        setPagination(result?.pagination || null);
      } catch (requestError: any) {
        setError(
          requestError?.message || "Unable to load your saved listings.",
        );
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [section],
  );

  const loadMyListings = useCallback(
    async (page = 1, append = false) => {
      if (section !== "my-listings") return;
      if (append) setMyListingsMoreLoading(true);
      else setMyListingsLoading(true);
      setMyListingsError("");
      try {
        const result = await fetchMyListings(page);
        const next = result?.data || [];
        setMyListings((current) => {
          if (!append) return next;
          const existingIds = new Set(
            current.map((listing: any) => listing.id),
          );
          return [
            ...current,
            ...next.filter((listing: any) => !existingIds.has(listing.id)),
          ];
        });
        setMyListingsPagination(result?.pagination || null);
      } catch (requestError: any) {
        setMyListingsError(
          requestError?.message || "Unable to load your listings.",
        );
        if (!append) setMyListings([]);
      } finally {
        setMyListingsLoading(false);
        setMyListingsMoreLoading(false);
        setMyListingsRefreshing(false);
      }
    },
    [section],
  );

  const loadSupport = useCallback(
    async (page = 1, append = false) => {
      if (section !== "support") return;
      if (append) setSupportMoreLoading(true);
      else setSupportLoading(true);
      setSupportError("");
      try {
        const result = await fetchSupportTicketsPage(page);
        const next = result?.data || [];
        setSupportTickets((current) =>
          append
            ? [
                ...current,
                ...next.filter(
                  (ticket: any) =>
                    !current.some((item: any) => item.id === ticket.id),
                ),
              ]
            : next,
        );
        setSupportMeta(result?.meta || null);
      } catch (requestError: any) {
        setSupportError(
          requestError?.message || "Unable to load support tickets.",
        );
        if (!append) setSupportTickets([]);
      } finally {
        setSupportLoading(false);
        setSupportMoreLoading(false);
        setSupportRefreshing(false);
      }
    },
    [section],
  );

  // Load data for generic sections (bookings, job‑requests, reviews, kyc)
  const loadSection = useCallback(
    async (page = 1, append = false) => {
      setError("");
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        let result;
        switch (section) {
          case "bookings":
            result = await fetchBookings(page);
            break;
          case "job-requests":
            result = await fetchJobRequests(page);
            break;
          case "reviews":
            result = await fetchReviews(page);
            break;
          case "kyc": {
            const kyc = await fetchKyc();
            result = {
              data: kyc?.submitted ? [kyc.submitted] : [],
              pagination: null,
            };
            break;
          }
          default:
            return;
        }
        const nextItems = result?.data || [];
        setItems((current) => {
          if (!append) return nextItems;
          const ids = new Set(
            current.map((i: any) => i.id || i.listing?.id).filter(Boolean),
          );
          return [
            ...current,
            ...nextItems.filter((i: any) => !ids.has(i.id || i.listing?.id)),
          ];
        });
        if (result?.pagination) setPagination(result.pagination);
      } catch (e: any) {
        setError(e?.message || "Unable to load data.");
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [section],
  ); // end of loadSection definition

  // Initial load handled by focus effect; no duplicate request.
  useEffect(() => {
    // No operation; generic sections are loaded via focus effect.
  }, [section]);

  useFocusEffect(
    useCallback(() => {
      if (section === "wishlist") {
        loadWishlist();
      } else if (section === "my-listings") {
        loadMyListings();
      } else if (section === "support") {
        loadSupport();
      } else {
        // Generic sections: bookings, job-requests, reviews, kyc
        setRefreshing(true);
        loadSection(1, false);
      }
    }, [loadWishlist, loadMyListings, loadSupport, loadSection, section]),
  );

  const confirmDelete = (listing: any) => {
    setDeleteListingError("");
    setListingToDelete(listing);
  };

  const handleConfirmDeleteListing = async () => {
    if (!listingToDelete) return;
    setIsDeletingListing(true);
    setDeleteListingError("");
    try {
      await deleteListing(listingToDelete.id);
      setMyListings((current) =>
        current.filter((item) => item.id !== listingToDelete.id),
      );
      setListingToDelete(null);
    } catch (requestError: any) {
      setDeleteListingError(
        requestError?.message || "Unable to delete this listing.",
      );
    } finally {
      setIsDeletingListing(false);
    }
  };

  const submitSupportTicket = async () => {
    if (!supportSubject.trim() || !supportMessage.trim() || supportSubmitting)
      return;
    setSupportSubmitting(true);
    setSupportError("");
    try {
      const result = await createSupportTicket({
        subject: supportSubject.trim(),
        priority: supportPriority.trim(),
        message: supportMessage.trim(),
      });
      if (result?.enabled === false) {
        setSupportError(result.message || "Support tickets are temporarily unavailable.");
        return;
      }
      setSupportSubject("");
      setSupportPriority("normal");
      setSupportMessage("");
      setCreateSupportVisible(false);
      loadSupport();
    } catch (requestError: any) {
      setSupportError(
        requestError?.message || "Unable to create support ticket.",
      );
    } finally {
      setSupportSubmitting(false);
    }
  };

  if (section === "wishlist") {
    const hasMore =
      pagination && pagination.current_page < pagination.last_page;
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadWishlist();
              }}
              colors={["#1d4ed8"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.title}>Wishlist</Text>
          {loading && !refreshing ? (
            <ActivityIndicator color="#1d4ed8" style={styles.loader} />
          ) : null}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                onPress={() => loadWishlist()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
          {!loading && !error && items.length === 0 ? (
            <Text style={styles.empty}>No saved listings yet.</Text>
          ) : null}
          {items.map((item) =>
            item.listing ? (
              <ListingCard
                key={item.wishlist_id || item.listing.id}
                listing={item.listing}
                onPress={(listing) => {
                  setSelectedListingId(listing.id);
                  setDetailVisible(true);
                }}
              />
            ) : null,
          )}
          {!error && hasMore ? (
            <Pressable
              onPress={() => loadWishlist(pagination.current_page + 1, true)}
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
        <ListingDetailModal
          visible={detailVisible}
          listingId={selectedListingId}
          onWishlistChange={(isFavorited, changedListingId) => {
            if (!isFavorited)
              setItems((current) =>
                current.filter((item) => item.listing?.id !== changedListingId),
              );
          }}
          onClose={() => {
            setDetailVisible(false);
            loadWishlist();
          }}
        />
      </SafeAreaView>
    );
  }

  if (section === "my-listings") {
    const hasMore =
      myListingsPagination &&
      myListingsPagination.current_page < myListingsPagination.last_page;
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={myListingsRefreshing}
              onRefresh={() => {
                setMyListingsRefreshing(true);
                loadMyListings();
              }}
              colors={["#1d4ed8"]}
            />
          }
        >
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.title}>My listings</Text>
          {myListingsLoading && !myListingsRefreshing ? (
            <ActivityIndicator color="#1d4ed8" style={styles.loader} />
          ) : null}
          {myListingsError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{myListingsError}</Text>
              <Pressable
                onPress={() => loadMyListings()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
          {!myListingsLoading && !myListingsError && myListings.length === 0 ? (
            <Text style={styles.empty}>No listings yet.</Text>
          ) : null}
          {myListings.map((listing) => (
            <View key={listing.id} style={styles.managementCard}>
              <ListingCard
                listing={listing}
                onPress={() =>
                  router.push({
                    pathname: "/listing/[id]",
                    params: { id: String(listing.id) },
                  })
                }
              />
              <View style={styles.managementActions}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/account/promote-listing/[id]",
                      params: { id: String(listing.id) },
                    })
                  }
                  style={styles.promoteButton}
                >
                  <Text style={styles.promoteText}>Promote</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/account/edit-listing/[id]",
                      params: { id: String(listing.id) },
                    })
                  }
                  style={styles.editButton}
                >
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(listing)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {!myListingsError && hasMore ? (
            <Pressable
              onPress={() =>
                loadMyListings(myListingsPagination.current_page + 1, true)
              }
              disabled={myListingsMoreLoading}
              style={styles.loadMoreButton}
            >
              {myListingsMoreLoading ? (
                <ActivityIndicator color="#1d4ed8" />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>

        <Modal
          visible={!!listingToDelete}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isDeletingListing) setListingToDelete(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Delete listing</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to delete "{listingToDelete?.title}"? This cannot be undone.
              </Text>
              {deleteListingError ? (
                <Text style={styles.modalError}>{deleteListingError}</Text>
              ) : null}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setListingToDelete(null)}
                  disabled={isDeletingListing}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmDeleteListing}
                  disabled={isDeletingListing}
                  style={styles.confirmDeleteButton}
                >
                  {isDeletingListing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmDeleteText}>Delete</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (section === "support") {
    const hasMore =
      supportMeta && supportMeta.current_page < supportMeta.last_page;
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={supportRefreshing}
              onRefresh={() => {
                setSupportRefreshing(true);
                loadSupport();
              }}
              colors={["#1d4ed8"]}
            />
          }
        >
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <View style={styles.supportTitleRow}>
            <Text style={styles.title}>Support tickets</Text>
            <Pressable
              onPress={() => setCreateSupportVisible(true)}
              style={styles.createButton}
            >
              <Text style={styles.createText}>New ticket</Text>
            </Pressable>
          </View>
          {supportLoading && !supportRefreshing ? (
            <ActivityIndicator color="#1d4ed8" style={styles.loader} />
          ) : null}
          {supportError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{supportError}</Text>
              <Pressable
                onPress={() => loadSupport()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
          {!supportLoading && !supportError && supportTickets.length === 0 ? (
            <Text style={styles.empty}>No support tickets yet.</Text>
          ) : null}
          {supportTickets.map((ticket) => (
            <Pressable
              key={ticket.id}
              onPress={() =>
                router.push({
                  pathname: "/account/support-ticket/[id]",
                  params: { id: String(ticket.id) },
                })
              }
              style={styles.ticketCard}
            >
              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <Text style={styles.ticketMeta}>
                #{ticket.ticket_id || ticket.id} · {ticket.status || "Unknown"}{" "}
                · {ticket.priority || "No priority"}
              </Text>
              <Text style={styles.ticketMeta}>
                {ticket.unseen_message
                  ? `${ticket.unseen_message} unread message(s)`
                  : "View ticket"}
              </Text>
            </Pressable>
          ))}
          {!supportError && hasMore ? (
            <Pressable
              onPress={() => loadSupport(supportMeta.current_page + 1, true)}
              disabled={supportMoreLoading}
              style={styles.loadMoreButton}
            >
              {supportMoreLoading ? (
                <ActivityIndicator color="#1d4ed8" />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
        <Modal
          visible={createSupportVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateSupportVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New support ticket</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Subject *</Text>
                <TextInput
                  style={styles.supportInput}
                  placeholder="Enter ticket subject"
                  placeholderTextColor="#94a3b8"
                  value={supportSubject}
                  onChangeText={setSupportSubject}
                  maxLength={255}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Priority</Text>
                <TextInput
                  style={styles.supportInput}
                  placeholder="e.g. low, normal, high"
                  placeholderTextColor="#94a3b8"
                  value={supportPriority}
                  onChangeText={setSupportPriority}
                  maxLength={30}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Message *</Text>
                <TextInput
                  style={[styles.supportInput, styles.supportMultiline]}
                  placeholder="Describe your issue in detail"
                  placeholderTextColor="#94a3b8"
                  value={supportMessage}
                  onChangeText={setSupportMessage}
                  multiline
                  maxLength={10000}
                />
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setCreateSupportVisible(false)}
                  disabled={supportSubmitting}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={submitSupportTicket}
                  disabled={
                    supportSubmitting ||
                    !supportSubject.trim() ||
                    !supportMessage.trim()
                  }
                  style={styles.createButton}
                >
                  {supportSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createText}>Submit</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  const records =
    section === "kyc"
      ? items.length
        ? items
        : [{ id: "kyc", status: "Not submitted" }]
      : items;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSection(1, false);
            }}
            colors={["#1d4ed8"]}
          />
        }
      >
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <Text style={styles.title}>{titles[section] || "Account"}</Text>
        {loading ? (
          <ActivityIndicator color="#1d4ed8" style={styles.loader} />
        ) : null}
        {!loading && items.length === 0 ? (
          <Text style={styles.empty}>No records found.</Text>
        ) : null}
        {records.map((item, index) => (
          <Pressable
            key={item.id || index}
            onPress={() => {
              const id = item.id || item.listing?.id;
              if (id)
                router.push({
                  pathname: "/listing/[id]",
                  params: { id: String(id) },
                });
            }}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.itemTitle}>
              {item.listing?.title ||
                item.title ||
                item.plan_name ||
                item.comment ||
                item.subject ||
                `Record ${index + 1}`}
            </Text>
            <Text style={styles.itemMeta}>
              {item.status || item.rating
                ? `Status: ${item.status || `${item.rating}/5`}`
                : "View details"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3f7fc" },
  content: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 40,
  },
  eyebrow: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 5,
    marginBottom: 22,
  },
  loader: { marginTop: 40 },
  empty: {
    color: "#64748b",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 10,
  },
  item: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#dbe4f0",
  },
  itemTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  itemMeta: { color: "#64748b", fontSize: 12, marginTop: 6 },
  errorBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  errorText: { color: "#b91c1c", marginBottom: 10 },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { color: "#fff", fontWeight: "700" },
  loadMoreButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  loadMoreText: { color: "#1d4ed8", fontWeight: "700" },
  managementCard: { marginBottom: 6 },
  managementActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: -8,
    marginBottom: 14,
  },
  promoteButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#0e7a7f",
    borderRadius: 8,
    paddingVertical: 9,
  },
  promoteText: { color: "#fff", fontWeight: "700" },
  editButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingVertical: 9,
  },
  editText: { color: "#fff", fontWeight: "700" },
  deleteButton: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 8,
    paddingVertical: 9,
  },
  deleteText: { color: "#dc2626", fontWeight: "700" },
  supportTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  createButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  createText: { color: "#fff", fontWeight: "700" },
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#dbe4f0",
  },
  ticketSubject: { color: "#111827", fontSize: 15, fontWeight: "700" },
  ticketMeta: { color: "#64748b", fontSize: 12, marginTop: 5 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(16, 25, 21, 0.48)",
  },
  modalCard: { backgroundColor: "#fff", borderRadius: 12, padding: 18 },
  modalTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 12,
  },
  supportInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    color: "#111827",
    backgroundColor: "#fff",
  },
  supportMultiline: { minHeight: 100, textAlignVertical: "top" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 14,
    marginTop: 4,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 7,
  },
  cancelText: { color: "#475569", fontWeight: "700" },
  confirmDeleteButton: {
    minHeight: 40,
    minWidth: 84,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmDeleteText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  modalMessage: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 16,
  },
  modalError: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
});
