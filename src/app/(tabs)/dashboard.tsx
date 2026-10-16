import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
import { fetchDashboard } from "../../api/dashboard";
import { BottomTabInset } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";

export default function DashboardScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [listingCount, setListingCount] = useState(0);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      try {
        if (!user) {
          setDashboardData(null);
          setListingCount(0);
          setSavedCount(0);
          return;
        }

        const profile = await refreshUser();
        const dashboard = profile ? await fetchDashboard().catch(() => null) : null;

        if (profile) {
          setListingCount(profile.total_listings || 0);
        }
        if (dashboard) {
          setDashboardData(dashboard);
          setListingCount(dashboard.totals?.listings || 0);
          setSavedCount(dashboard.totals?.wishlist || 0);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [refreshUser, user],
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadDashboard(true)}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ACCOUNT</Text>
            <Text style={styles.title}>Your dashboard</Text>
          </View>
          <Pressable onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </View>
          )}
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>
              {user?.name || "Account holder"}
            </Text>
            <Text style={styles.profileEmail}>
              {user?.email || "No email available"}
            </Text>
            {!!user?.phone && (
              <Text style={styles.profileDetail}>{user.phone}</Text>
            )}
            {!!user?.designation && (
              <Text style={styles.profileDetail}>{user.designation}</Text>
            )}
            {!!(user?.address || user?.country) && (
              <Text style={styles.profileDetail}>
                {[user.address, user.country].filter(Boolean).join(", ")}
              </Text>
            )}
            {!!user?.about_me && (
              <Text style={styles.profileAbout}>{user.about_me}</Text>
            )}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#1d4ed8"
            style={styles.loader}
          />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard value={listingCount} label="Total listings" />
            <StatCard
              value={dashboardData?.totals?.featured_listings || 0}
              label="Featured listings"
            />
            <StatCard
              value={dashboardData?.totals?.pending_listings || 0}
              label="Pending listings"
            />
            <StatCard value={savedCount} label="Wishlist" />
          </View>
        )}

        {!!dashboardData && <DashboardCharts data={dashboardData} />}

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Account activity</Text>
          {[
            ["bookings", "My booking list"],
            ["job-requests", "My job requests"],
            ["reviews", "My reviews"],
            ["my-listings", "My listings"],
            ["wishlist", "Wishlist"],
            ["notifications", "Notifications"],
            ["kyc", "KYC verification"],
            ["support", "Support tickets"],
          ].map(([section, label]) => (
            <Pressable
              key={section}
              style={styles.actionRow}
              onPress={() => {
                router.push(`/account/${section}`);
              }}
            >
              <Text style={styles.actionLabel}>{label}</Text>
              <Text style={styles.actionArrow}>View</Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push("/account/tools")}
          >
            <Text style={styles.actionLabel}>
              Edit profile, password & account
            </Text>
            <Text style={styles.actionArrow}>Manage</Text>
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push("/account/email-verification")}
          >
            <Text style={styles.actionLabel}>Email verification</Text>
            <Text style={styles.actionArrow}>View</Text>
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push("/account/create-listing")}
          >
            <Text style={styles.actionLabel}>Create listing</Text>
            <Text style={styles.actionArrow}>Create</Text>
          </Pressable>
          <Pressable
            style={styles.actionRow}
            onPress={() => router.push("/account/subscription-plans")}
          >
            <Text style={styles.actionLabel}>Pricing plans</Text>
            <Text style={styles.actionArrow}>View</Text>
          </Pressable>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Account details</Text>
          <InfoRow
            label="Location"
            value={user?.country || user?.address || "Not added yet"}
          />
          <InfoRow label="Member since" value={formatDate(user?.created_at)} />
          <InfoRow
            label="About"
            value={
              user?.about_me || "Add a short introduction to your profile."
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DashboardCharts({ data }: { data: any }) {
  const listingValues = data.charts?.listings_created || [];
  const maxListings = Math.max(...listingValues, 1);
  const status = data.charts?.listing_status || {};
  const spent = data.totals?.spent || 0;

  return (
    <View style={styles.chartSection}>
      <View style={styles.chartPanel}>
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>Listings created</Text>
          <Text style={styles.chartHint}>Last 6 months</Text>
        </View>
        <View style={styles.barChart}>
          {listingValues.map((value: number, index: number) => (
            <View
              key={`${data.charts.labels[index]}-${index}`}
              style={styles.barColumn}
            >
              <View
                style={[
                  styles.bar,
                  { height: Math.max(5, (value / maxListings) * 86) },
                ]}
              />
              <Text style={styles.axisLabel}>{data.charts.labels[index]}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.chartPanel}>
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>Dashboard overview</Text>
          <Text style={styles.chartHint}>dashboard</Text>
        </View>
        <Text style={styles.spentValue}>
          Rs {Number(spent).toLocaleString()}
        </Text>
        <Text style={styles.chartHint}>Total money spent</Text>
        <Text style={styles.statusText}>
          Approved {status.approved || 0} | Pending {status.pending || 0}
        </Text>
      </View>
    </View>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3f7fc" },
  content: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    padding: 20,
    paddingBottom: BottomTabInset + 80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  eyebrow: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: { color: "#111827", fontSize: 28, fontWeight: "800", marginTop: 5 },
  logoutButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { color: "#dc2626", fontSize: 12, fontWeight: "700" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#dbe4f0",
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dbeafe",
  },
  avatarText: { color: "#1e40af", fontSize: 25, fontWeight: "800" },
  profileCopy: { marginLeft: 14, flex: 1 },
  profileName: { color: "#111827", fontSize: 18, fontWeight: "700" },
  profileEmail: { color: "#64748b", fontSize: 13, marginTop: 4 },
  profileDetail: { color: "#64748b", fontSize: 12, marginTop: 3 },
  profileAbout: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  statCard: {
    width: "47%",
    backgroundColor: "#172554",
    borderRadius: 12,
    padding: 16,
  },
  statValue: { color: "#fff", fontSize: 28, fontWeight: "800" },
  statLabel: { color: "#bfdbfe", fontSize: 12, marginTop: 4 },
  chartSection: { gap: 14, marginTop: 16 },
  chartPanel: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#dbe4f0",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chartHint: { color: "#64748b", fontSize: 11 },
  barChart: {
    height: 125,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    marginTop: 16,
  },
  barColumn: {
    height: 115,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  bar: { width: 22, backgroundColor: "#1d4ed8", borderRadius: 5 },
  axisLabel: { color: "#64748b", fontSize: 10 },
  spentValue: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 22,
  },
  statusText: { color: "#334155", fontSize: 13, marginTop: 22 },
  actionsSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#dbe4f0",
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: "#edf2f9",
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionLabel: { color: "#334155", fontSize: 14, fontWeight: "600" },
  actionArrow: { color: "#1d4ed8", fontSize: 12, fontWeight: "700" },
  loader: { marginVertical: 45 },
  infoSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#dbe4f0",
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 16,
  },
  infoRow: {
    borderTopWidth: 1,
    borderTopColor: "#edf2f9",
    paddingVertical: 13,
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: { color: "#334155", fontSize: 14, marginTop: 4 },
});
