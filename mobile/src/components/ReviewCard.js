import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

const getRatingColor = (rating) => {
    if (rating >= 9) return '#10B981';
    if (rating >= 7) return '#3B82F6';
    if (rating >= 5) return '#F59E0B';
    if (rating >= 3) return '#F97316';
    return '#EF4444';
};

const getRatingLabel = (rating) => {
    if (rating >= 9) return 'Masterpiece';
    if (rating >= 7) return 'Great Read';
    if (rating >= 5) return 'Decent';
    if (rating >= 3) return 'Weak';
    return 'Poor';
};

export default function ReviewCard({ review, isLiked, onLike, onUserPress, showLike = true }) {
    const ratingColor = getRatingColor(review.Rating);
    const timeAgo = getTimeAgo(review.CreatedAt);

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.bookInfo}>
                    <Ionicons name="book" size={14} color={COLORS.accent} style={{ marginRight: 5 }} />
                    <Text style={styles.bookTitle} numberOfLines={1}>
                        {review.TitleNormalized}
                    </Text>
                </View>
                {review.Author ? (
                    <Text style={styles.author} numberOfLines={1}>by {review.Author}</Text>
                ) : null}
            </View>

            <View style={styles.ratingRow}>
                <View style={[styles.ratingBadge, { backgroundColor: ratingColor + '22', borderColor: ratingColor }]}>
                    <Text style={[styles.ratingNumber, { color: ratingColor }]}>{review.Rating}</Text>
                    <Text style={[styles.ratingMax, { color: ratingColor + 'AA' }]}>/10</Text>
                </View>
                <Text style={[styles.ratingLabel, { color: ratingColor }]}>{getRatingLabel(review.Rating)}</Text>
            </View>

            {review.Comment ? (
                <Text style={styles.comment} numberOfLines={4}>{review.Comment}</Text>
            ) : null}

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.userBtn}
                    onPress={() => onUserPress && onUserPress(review.UserID)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(review.Username || '?')[0].toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.username}>{review.Username}</Text>
                </TouchableOpacity>

                <View style={styles.footerRight}>
                    <Text style={styles.time}>{timeAgo}</Text>
                    {showLike && (
                        <TouchableOpacity
                            style={styles.likeBtn}
                            onPress={() => onLike && onLike(review.ReviewID)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isLiked ? 'heart' : 'heart-outline'}
                                size={16}
                                color={isLiked ? COLORS.danger : COLORS.textMuted}
                            />
                            <Text style={[styles.likeCount, { color: isLiked ? COLORS.danger : COLORS.textMuted }]}>
                                {review.LikeCount || 0}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 2592000)}mo ago`;
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        marginBottom: SPACING.sm,
    },
    bookInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bookTitle: {
        fontSize: FONTS.md,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
    },
    author: {
        fontSize: FONTS.sm,
        color: COLORS.accent,
        marginTop: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        gap: SPACING.sm,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
    },
    ratingNumber: {
        fontSize: FONTS.lg,
        fontWeight: '800',
    },
    ratingMax: {
        fontSize: FONTS.xs,
        fontWeight: '600',
    },
    ratingLabel: {
        fontSize: FONTS.sm,
        fontWeight: '600',
    },
    comment: {
        fontSize: FONTS.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: SPACING.md,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    userBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        flex: 1,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary + '33',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary + '66',
    },
    avatarText: {
        fontSize: FONTS.xs,
        fontWeight: '700',
        color: COLORS.primary,
    },
    username: {
        fontSize: FONTS.sm,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    footerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    time: {
        fontSize: FONTS.xs,
        color: COLORS.textMuted,
    },
    likeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    likeCount: {
        fontSize: FONTS.xs,
        fontWeight: '600',
    },
});
