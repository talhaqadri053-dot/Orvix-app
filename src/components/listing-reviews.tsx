import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ListingReviewsProps {
  reviews?: any[];
  averageRating?: number;
  reviewsCount?: number;
}

export default function ListingReviews({ reviews = [], averageRating = 0, reviewsCount = 0 }: ListingReviewsProps) {
  if (!reviewsCount && reviews.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Reviews</Text>
        <Text style={styles.summary}>★ {averageRating} ({reviewsCount})</Text>
      </View>
      {reviews.length === 0 ? (
        <Text style={styles.empty}>No approved reviews are available.</Text>
      ) : (
        reviews.map((review) => (
          <View key={review.id} style={styles.review}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewer}>{review.user?.name || 'Anonymous'}</Text>
              <Text style={styles.rating}>★ {review.rating}</Text>
            </View>
            {review.created_at ? <Text style={styles.date}>{new Date(review.created_at).toLocaleDateString()}</Text> : null}
            {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heading: { color: '#111827', fontSize: 16, fontWeight: '700' },
  summary: { color: '#1e40af', fontSize: 13, fontWeight: '700' },
  empty: { color: '#64748b', fontSize: 13 },
  review: { backgroundColor: '#f3f7fc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 11, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewer: { color: '#111827', fontSize: 13, fontWeight: '700' },
  rating: { color: '#b45309', fontSize: 12, fontWeight: '700' },
  date: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  comment: { color: '#334155', fontSize: 13, lineHeight: 19, marginTop: 7 },
});
