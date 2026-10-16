import { useLocalSearchParams, useRouter } from "expo-router";
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
import { fetchSupportTicket, replyToSupportTicket } from "../../../api/support";

export default function SupportTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const ticketId = Array.isArray(id) ? id[0] : id;
  const [ticket, setTicket] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadTicket = useCallback(async () => {
    if (!ticketId) {
      setError("Invalid support ticket.");
      setLoading(false);
      return;
    }
    setError("");
    try {
      setTicket(await fetchSupportTicket(ticketId));
    } catch (requestError) {
      setError(requestError?.message || "Unable to load support ticket.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const sendReply = async () => {
    if (!message.trim() || sending || ticket?.status === "closed") return;
    setSending(true);
    setError("");
    try {
      const result = await replyToSupportTicket(ticketId, message.trim());
      if (result?.enabled === false) {
        setError(result.message || "Support replies are temporarily unavailable.");
        return;
      }
      setMessage("");
      await loadTicket();
    } catch (requestError) {
      setError(requestError?.message || "Unable to send your reply.");
    } finally {
      setSending(false);
    }
  };

  if (loading)
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#1d4ed8" />
        <Text style={styles.muted}>Loading ticket...</Text>
      </SafeAreaView>
    );
  if (error && !ticket)
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={loadTicket} style={styles.button}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );

  const messages = ticket?.get_messages || ticket?.getMessages || [];
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {ticket?.subject || "Support ticket"}
        </Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTicket();
            }}
            colors={["#1d4ed8"]}
          />
        }
      >
        <View style={styles.summary}>
          <Text style={styles.subject}>{ticket?.subject}</Text>
          <Text style={styles.meta}>
            Ticket #{ticket?.ticket_id || ticket?.id}
          </Text>
          <Text style={styles.meta}>
            Priority: {ticket?.priority || "Not specified"} · Status:{" "}
            {ticket?.status || "Unknown"}
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {messages.length === 0 ? (
          <Text style={styles.empty}>No messages yet.</Text>
        ) : (
          messages.map((item: any) => (
            <View
              key={item.id}
              style={[
                styles.message,
                item.message_from === "admin"
                  ? styles.adminMessage
                  : styles.userMessage,
              ]}
            >
              <Text style={styles.messageLabel}>
                {item.message_from === "admin" ? "Support" : "You"}
              </Text>
              <Text style={styles.messageText}>{item.message}</Text>
              {item.created_at ? (
                <Text style={styles.date}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              ) : null}
            </View>
          ))
        )}
        {ticket?.status === "closed" ? (
          <Text style={styles.closed}>
            This ticket is closed and cannot receive new messages.
          </Text>
        ) : (
          <>
            <Text style={styles.label}>Reply Message</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={message}
              onChangeText={setMessage}
              placeholder="Write a reply..."
              placeholderTextColor="#94a3b8"
              multiline
              editable={!sending}
              maxLength={10000}
            />
            <Pressable
              onPress={sendReply}
              disabled={sending || !message.trim()}
              style={styles.button}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send reply</Text>
              )}
            </Pressable>
          </>
        )}
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
  },
  muted: { color: "#64748b", marginTop: 10 },
  error: { color: "#b91c1c", marginBottom: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#dbe4f0",
  },
  back: { color: "#1d4ed8", fontWeight: "700", padding: 6 },
  title: { flex: 1, textAlign: "center", color: "#111827", fontWeight: "800" },
  spacer: { width: 54 },
  content: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 48,
  },
  summary: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dbe4f0",
  },
  subject: { color: "#111827", fontSize: 17, fontWeight: "800" },
  meta: { color: "#64748b", fontSize: 12, marginTop: 5 },
  message: { padding: 12, borderRadius: 10, marginBottom: 9, maxWidth: "90%" },
  adminMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
  },
  userMessage: { alignSelf: "flex-end", backgroundColor: "#dbeafe" },
  messageLabel: { color: "#1e40af", fontSize: 11, fontWeight: "800" },
  messageText: { color: "#334155", lineHeight: 20, marginTop: 4 },
  date: { color: "#94a3b8", fontSize: 10, marginTop: 6 },
  empty: { color: "#64748b", textAlign: "center", padding: 18 },
  closed: {
    color: "#92400e",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  label: {
    color: "#1e293b",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    minHeight: 48,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dbe4f0",
    borderRadius: 10,
    padding: 12,
    color: "#111827",
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  button: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
