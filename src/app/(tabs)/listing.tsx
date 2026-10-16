import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { deleteListing, fetchMyListings } from "../../api/listings";
import ListingCard from "../../components/listing-card";

export default function ListingScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [listingToDelete, setListingToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadListings = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const result = await fetchMyListings();
      setListings(result?.data || []);
    } catch (requestError: any) {
      setError(requestError?.message || "Unable to load your listings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadListings();
    }, [loadListings]),
  );

  function confirmDelete(listing: any) {
    setDeleteError("");
    setListingToDelete(listing);
  }

  async function handleConfirmDelete() {
    if (!listingToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteListing(listingToDelete.id);
      setListings((current) =>
        current.filter((item) => item.id !== listingToDelete.id),
      );
      setListingToDelete(null);
    } catch (requestError: any) {
      setDeleteError(
        requestError?.message || "Unable to delete this listing.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadListings(true)}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
            <Text style={styles.title}>My listings</Text>
          </View>
          <Pressable
            onPress={() => router.push("/account/create-listing")}
            style={styles.createButton}
          >
            <Text style={styles.createButtonText}>＋ Create</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1d4ed8"
            style={styles.loader}
          />
        ) : null}
        {error ? (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => loadListings()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
        {!loading && !error && listings.length === 0 ? (
          <View style={styles.messageBox}>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptyText}>
              Your published posts will appear here.
            </Text>
          </View>
        ) : null}

        {listings.map((listing) => (
          <View key={listing.id} style={styles.listingItem}>
            <ListingCard
              listing={listing}
              onPress={() =>
                router.push({
                  pathname: "/listing/[id]",
                  params: { id: String(listing.id) },
                })
              }
            />
            <View style={styles.actions}>
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
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Edit</Text>
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
      </ScrollView>

      <Modal
        visible={!!listingToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) setListingToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete listing</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete "{listingToDelete?.title}"? This cannot be undone.
            </Text>
            {deleteError ? (
              <Text style={styles.modalError}>{deleteError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setListingToDelete(null)}
                disabled={isDeleting}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDelete}
                disabled={isDeleting}
                style={styles.confirmDeleteButton}
              >
                {isDeleting ? (
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3f7fc" },
  container: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  eyebrow: { color: "#1d4ed8", fontSize: 11, fontWeight: "800" },
  title: { color: "#111827", fontSize: 28, fontWeight: "800", marginTop: 5 },
  createButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 9,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  createButtonText: { color: "#fff", fontWeight: "700" },
  loader: { marginTop: 50 },
  messageBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 12,
    padding: 20,
  },
  errorText: { color: "#b91c1c", marginBottom: 8 },
  retryText: { color: "#1d4ed8", fontWeight: "700" },
  emptyTitle: { color: "#111827", fontSize: 16, fontWeight: "700" },
  emptyText: { color: "#64748b", marginTop: 5 },
  listingItem: { marginBottom: 8 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: -6,
    marginBottom: 12,
  },
  promoteButton: {
    backgroundColor: "#0e7a7f",
    borderRadius: 7,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  promoteText: { color: "#fff", fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#1d4ed8",
    borderRadius: 7,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  secondaryText: { color: "#1d4ed8", fontWeight: "700" },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 7,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  deleteText: { color: "#dc2626", fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 22,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
  },
  modalMessage: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 16,
  },
  modalError: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 14,
  },
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
});
