import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
    RefreshControl, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ReviewCard from '../components/ReviewCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function HomeScreen({ navigation }) {
    const { token } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [likedIds, setLikedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState('latest');
    const [minRating, setMinRating] = useState(1);
    const [maxRating, setMaxRating] = useState(10);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const fetchReviews = useCallback(async () => {
        try {
            const res = await api.get('/reviews/public', {
                params: { sortBy, minRating, maxRating },
            });
            setReviews(res.data);
        } catch (_) {}
    }, [sortBy, minRating, maxRating]);

    const fetchLikedIds = useCallback(async () => {
        if (!token) return;
        try {
            const res = await api.get('/reviews/my-liked-ids');
            setLikedIds(res.data);
        } catch (_) {}
    }, [token]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([fetchReviews(), fetchLikedIds()]);
            setLoading(false);
        })();
    }, [fetchReviews, fetchLikedIds]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchReviews(), fetchLikedIds()]);
        setRefreshing(false);
    };

    const handleLike = async (reviewId) => {
        if (!token) return;
        try {
            const res = await api.post(`/reviews/${reviewId}/like`);
            if (res.data.liked) {
                setLikedIds(prev => [...prev, reviewId]);
                setReviews(prev => prev.map(r =>
                    r.ReviewID === reviewId ? { ...r, LikeCount: (r.LikeCount || 0) + 1 } : r
                ));
            } else {
                setLikedIds(prev => prev.filter(id => id !== reviewId));
                setReviews(prev => prev.map(r =>
                    r.ReviewID === reviewId ? { ...r, LikeCount: Math.max(0, (r.LikeCount || 0) - 1) } : r
                ));
            }
        } catch (_) {}
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query.trim()) return setSearchResults([]);
        setSearchLoading(true);
        try {
            const res = await api.get('/users/search', { params: { q: query } });
            setSearchResults(res.data);
        } catch (_) {}
        setSearchLoading(false);
    };

    if (loading) return <LoadingSpinner message="Loading community feed..." />;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Explore</Text>
                <Text style={styles.headerSub}>{reviews.length} reviews in the community</Text>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search readers..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                        <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {searchQuery ? (
                <ScrollView style={styles.searchResults}>
                    {searchLoading ? (
                        <Text style={styles.searchHint}>Searching...</Text>
                    ) : searchResults.length === 0 ? (
                        <Text style={styles.searchHint}>No readers found for "{searchQuery}"</Text>
                    ) : (
                        searchResults.map(user => (
                            <TouchableOpacity
                                key={user.UserID}
                                style={styles.userResultCard}
                                onPress={() => {
                                    setSearchQuery('');
                                    setSearchResults([]);
                                    navigation.navigate('UserProfile', { userId: user.UserID, username: user.Username });
                                }}
                            >
                                <View style={styles.userAvatar}>
                                    <Text style={styles.userAvatarText}>{user.Username[0].toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.userName}>{user.Username}</Text>
                                    <Text style={styles.userMeta}>{user.ReviewCount} public reviews</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            ) : (
                <>
                    <View style={styles.filtersRow}>
                        <TouchableOpacity
                            style={[styles.sortBtn, sortBy === 'latest' && styles.sortBtnActive]}
                            onPress={() => setSortBy('latest')}
                        >
                            <Ionicons name="time-outline" size={14} color={sortBy === 'latest' ? COLORS.primary : COLORS.textMuted} />
                            <Text style={[styles.sortBtnText, sortBy === 'latest' && styles.sortBtnTextActive]}>Latest</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.sortBtn, sortBy === 'likes' && styles.sortBtnActive]}
                            onPress={() => setSortBy('likes')}
                        >
                            <Ionicons name="heart-outline" size={14} color={sortBy === 'likes' ? COLORS.primary : COLORS.textMuted} />
                            <Text style={[styles.sortBtnText, sortBy === 'likes' && styles.sortBtnTextActive]}>Most Liked</Text>
                        </TouchableOpacity>

                        <View style={styles.ratingFilter}>
                            <Text style={styles.ratingFilterLabel}>{minRating}–{maxRating} ★</Text>
                        </View>
                    </View>

                    <FlatList
                        data={reviews}
                        keyExtractor={item => item.ReviewID.toString()}
                        renderItem={({ item }) => (
                            <ReviewCard
                                review={item}
                                isLiked={likedIds.includes(item.ReviewID)}
                                onLike={handleLike}
                                onUserPress={(userId) =>
                                    navigation.navigate('UserProfile', { userId, username: item.Username })
                                }
                                showLike={!!token}
                            />
                        )}
                        contentContainerStyle={styles.list}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>No reviews yet. Be the first!</Text>
                            </View>
                        }
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: SPACING.base, paddingTop: SPACING.base, paddingBottom: SPACING.sm },
    headerTitle: { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.text },
    headerSub: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 2 },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        marginHorizontal: SPACING.base, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md,
    },
    searchIcon: { marginRight: SPACING.xs },
    searchInput: { flex: 1, paddingVertical: SPACING.md, fontSize: FONTS.base, color: COLORS.text },
    searchResults: { flex: 1, paddingHorizontal: SPACING.base },
    searchHint: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xl, fontSize: FONTS.sm },
    userResultCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        padding: SPACING.md, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md,
    },
    userAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: COLORS.primary + '33', justifyContent: 'center', alignItems: 'center',
    },
    userAvatarText: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.primary },
    userName: { fontSize: FONTS.base, fontWeight: '600', color: COLORS.text },
    userMeta: { fontSize: FONTS.sm, color: COLORS.textMuted },
    filtersRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: SPACING.base, marginBottom: SPACING.sm, gap: SPACING.sm,
    },
    sortBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: SPACING.md, paddingVertical: 6,
        borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
        borderWidth: 1, borderColor: COLORS.border,
    },
    sortBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
    sortBtnText: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: '600' },
    sortBtnTextActive: { color: COLORS.primary },
    ratingFilter: {
        marginLeft: 'auto', paddingHorizontal: SPACING.md, paddingVertical: 6,
        backgroundColor: COLORS.accent + '22', borderRadius: RADIUS.full,
        borderWidth: 1, borderColor: COLORS.accent + '55',
    },
    ratingFilterLabel: { fontSize: FONTS.xs, color: COLORS.accent, fontWeight: '600' },
    list: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.xxl },
    emptyState: { alignItems: 'center', paddingTop: SPACING.xxl * 2, gap: SPACING.base },
    emptyText: { color: COLORS.textMuted, fontSize: FONTS.base },
});
