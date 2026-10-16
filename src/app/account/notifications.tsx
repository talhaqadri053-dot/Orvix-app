import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    fetchNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "../../api/notifications";

function notificationText(notification: any) {
  const data =
    notification?.data && typeof notification.data === "object"
      ? notification.data
      : {};
  return {
    title: data.title || data.subject || notification.type || "Notification",
    message: data.message || data.body || data.description || "",
  };
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [readingId, setReadingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async (page = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const result = await fetchNotifications(page);
      const next = result?.data || [];
      setNotifications((current) => {
        if (!append) return next;
        const existingIds = new Set(current.map((item) => item.id));
        return [
          ...current,
          ...next.filter((item) => !existingIds.has(item.id)),
        ];
      });
      setMeta(result?.meta || null);
    } catch (requestError) {
      setError(requestError?.message || "Unable to load notifications.");
      if (!append) setNotifications([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const markRead = async (notificationId: string) => {
    setReadingId(notificationId);
    setActionError("");
    try {
      await markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? { ...item, read: true, read_at: new Date().toISOString() }
            : item,
        ),
      );
      setMeta((current) =>
        current
          ? { ...current, unread: Math.max(0, (current.unread || 0) - 1) }
          : current,
      );
    } catch (requestError) {
      setActionError(
        requestError?.message || "Unable to mark notification as read.",
      );
    } finally {
      setReadingId(null);
    }
  };

  const markAllRead = async () => {
    if (markingAll || !meta?.unread) return;
    setMarkingAll(true);
    setActionError("");
    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          read_at: item.read_at || new Date().toISOString(),
        })),
      );
      setMeta((current) => (current ? { ...current, unread: 0 } : current));
    } catch (requestError) {
      setActionError(
        requestError?.message || "Unable to mark notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const hasMore = meta && meta.current_page < meta.last_page;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
            colors={["#1d4ed8"]}
          />
        }
      >
        <Text style={styles.eyebrow}>ACCOUNT</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Notifications</Text>
          {meta?.unread > 0 ? (
            <Text style={styles.unreadCount}>{meta.unread} unread</Text>
          ) : null}
        </View>
        {meta?.unread > 0 ? (
          <Pressable
            onPress={markAllRead}
            disabled={markingAll}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>
              {markingAll ? "Marking..." : "Mark all as read"}
            </Text>
          </Pressable>
        ) : null}
        {loading && !refreshing ? (
          <ActivityIndicator color="#1d4ed8" style={styles.loader} />
        ) : null}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => loadNotifications()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {actionError ? (
          <Text style={styles.actionError}>{actionError}</Text>
        ) : null}
        {!loading && !error && notifications.length === 0 ? (
          <Text style={styles.empty}>No notifications yet.</Text>
        ) : null}
        {notifications.map((notification) => {
          const text = notificationText(notification);
          return (
            <View
              key={notification.id}
              style={[
                styles.notification,
                !notification.read && styles.unreadNotification,
              ]}
            >
              <View style={styles.notificationCopy}>
                <Text style={styles.notificationTitle}>{text.title}</Text>
                {text.message ? (
                  <Text style={styles.notificationMessage}>{text.message}</Text>
                ) : null}
                {notification.created_at ? (
                  <Text style={styles.notificationDate}>
                    {new Date(notification.created_at).toLocaleString()}
                  </Text>
                ) : null}
              </View>
              {!notification.read ? (
                <Pressable
                  onPress={() => markRead(notification.id)}
                  disabled={readingId === notification.id}
                  style={styles.readButton}
                >
                  <Text style={styles.readText}>
                    {readingId === notification.id ? "..." : "Read"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
        {!error && hasMore ? (
          <Pressable
            onPress={() => loadNotifications(meta.current_page + 1, true)}
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
  content: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 48,
  },
  eyebrow: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 5,
    marginBottom: 18,
  },
  unreadCount: { color: "#1e40af", fontSize: 12, fontWeight: "700" },
  markAllButton: { alignSelf: "flex-start", marginBottom: 12 },
  markAllText: { color: "#1d4ed8", fontWeight: "700" },
  loader: { marginTop: 40 },
  notification: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#dbe4f0",
  },
  unreadNotification: { borderColor: "#60a5fa", backgroundColor: "#eff6ff" },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  notificationMessage: {
    color: "#475569",
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },
  notificationDate: { color: "#94a3b8", fontSize: 11, marginTop: 7 },
  readButton: { marginLeft: 10, padding: 6 },
  readText: { color: "#1d4ed8", fontSize: 12, fontWeight: "700" },
  empty: {
    color: "#64748b",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 10,
  },
  errorBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  errorText: { color: "#b91c1c", marginBottom: 10 },
  actionError: { color: "#b91c1c", marginBottom: 10 },
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
});
