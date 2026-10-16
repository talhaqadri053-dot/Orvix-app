import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import logo from "../../../assets/images/orvix.png";

export default function ListingSuccessScreen() {
  const { id: idParam, title: titleParam } = useLocalSearchParams<{
    id?: string;
    title?: string;
  }>();
  const router = useRouter();
  const listingId = Array.isArray(idParam) ? idParam[0] : idParam;
  const listingTitle = Array.isArray(titleParam) ? titleParam[0] : titleParam;

  function continueToListing() {
    if (listingId) {
      router.replace({ pathname: "/listing/[id]", params: { id: listingId } });
    } else {
      router.replace("/account/my-listings");
    }
  }

  function promoteListing() {
    if (listingId) {
      router.push({
        pathname: "/account/promote-listing/[id]",
        params: { id: listingId },
      });
    } else {
      router.replace("/account/my-listings");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        </View>

        <View style={styles.successPanel}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.title}>Thank you for creating your listing</Text>
          <Text style={styles.message}>
            {listingTitle
              ? `Your listing, ${listingTitle}, has been submitted successfully and is now active on the site.`
              : "Your listing has been submitted successfully and is now active on the site."}
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={promoteListing} style={styles.promoteButton}>
              <Text style={styles.promoteText}>Promote / Feature Listing</Text>
            </Pressable>
            <Pressable
              onPress={continueToListing}
              style={styles.continueButton}
            >
              <Text style={styles.continueText}>Continue Simple Listing</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3f6f7" },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 610,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dce5e9",
    borderRadius: 14,
  },
  logo: { width: 120, height: 40 },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#dce5e9",
    borderRadius: 20,
  },
  backText: { color: "#102235", fontSize: 13, fontWeight: "600" },
  successPanel: {
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 26,
    paddingTop: 27,
    paddingBottom: 27,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dce5e9",
    borderRadius: 16,
    shadowColor: "#18333b",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  checkCircle: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 33,
    backgroundColor: "#e2f0f0",
  },
  checkMark: { color: "#07838a", fontSize: 38, fontWeight: "500" },
  title: {
    marginTop: 12,
    color: "#0c1a2c",
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    maxWidth: 430,
    marginTop: 8,
    color: "#526274",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 22,
  },
  promoteButton: {
    minHeight: 40,
    minWidth: 170,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: "#0e8185",
  },
  promoteText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  continueButton: {
    minHeight: 40,
    minWidth: 170,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#dce5e9",
    borderRadius: 24,
    backgroundColor: "#f4f7f8",
  },
  continueText: { color: "#102235", fontSize: 13, fontWeight: "700" },
});
