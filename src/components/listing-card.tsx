import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ListingCardProps {
  listing: any;
  onPress?: (listing: any) => void;
  horizontal?: boolean;
}

export default function ListingCard({
  listing,
  onPress,
  horizontal = false,
}: ListingCardProps) {
  if (!listing) return null;

  return (
    <Pressable
      onPress={() => onPress?.(listing)}
      style={({ pressed }) => [
        horizontal ? styles.cardHorizontal : styles.cardVertical,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Image container */}
      <View
        style={
          horizontal
            ? styles.imageWrapperHorizontal
            : styles.imageWrapperVertical
        }
      >
        <Image
          source={
            listing.thumb_image_url
              ? { uri: listing.thumb_image_url }
              : undefined
          }
          style={styles.image}
          contentFit="cover"
          transition={150}
        />
        {listing.is_featured && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>FEATURED</Text>
          </View>
        )}
        <View style={styles.priceTag}>
          <Text style={styles.priceTagText}>{listing.display_price}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.categoryName} numberOfLines={1}>
          {listing.sub_category?.name || listing.category?.name || "Classified"}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.cityText} numberOfLines={1}>
            {listing.city?.name || "Location unavailable"}
          </Text>
          <Text style={styles.dateText}>{listing.formatted_date}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardHorizontal: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginRight: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardVertical: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  imageWrapperHorizontal: {
    width: "100%",
    height: 130,
    position: "relative",
    backgroundColor: "#edf2f9",
  },
  imageWrapperVertical: {
    width: "100%",
    height: 160,
    position: "relative",
    backgroundColor: "#edf2f9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  featuredBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#b45309",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  featuredBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  priceTag: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(16, 25, 21, 0.88)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceTagText: {
    color: "#60a5fa",
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    padding: 12,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1d4ed8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 18,
    minHeight: 36,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: "#edf2f9",
  },
  cityText: {
    fontSize: 11,
    color: "#64748b",
    flex: 1,
  },
  dateText: {
    fontSize: 10,
    color: "#94a3b8",
  },
});
