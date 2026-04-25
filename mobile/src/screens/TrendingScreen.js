import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet,
    TouchableOpacity, RefreshControl, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import ReviewCard from '../components/ReviewCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function TrendingScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('books'); // 'books' or 'reviews'
    const [books, setBooks] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            if (activeTab === 'books') {
                const res = await api.get('/trending');
                setBooks(res.data);
            } else {
                const res = await api.get('/reviews/public', { params: { sortBy: 'likes' } });
                setReviews(res.data.slice(0, 10)); // Top 10
            }
        } catch (_) {}
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);
        })();
    }, [activeTab]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    if (loading && !refreshing) return <LoadingSpinner message={`Loading top ${activeTab}...`} />;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Trending</Text>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'books' && styles.tabActive]}
                        onPress={() => setActiveTab('books')}
                    >
                        <Text style={[styles.tabText, activeTab === 'books' && styles.tabTextActive]}>Top Books</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
                        onPress={() => setActiveTab('reviews')}
                    >
                        <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>Top Reviews</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={activeTab === 'books' ? books : reviews}
                keyExtractor={item => (activeTab === 'books' ? item.BookID : item.ReviewID).toString()}
                renderItem={({ item, index }) => {
                    if (activeTab === 'reviews') {
                        return (
                            <View style={styles.reviewWrapper}>
                                <View style={styles.rankBadge}>
                                    <Text style={styles.rankText}>{index + 1}</Text>
                                </View>
                                <ReviewCard
                                    review={item}
                                    showLike={true}
                                    onUserPress={(userId) => navigation.navigate('UserProfile', { userId, username: item.Username })}
                                />
                            </View>
                        );
                    }

                    const maxCount = books[0]?.ReviewCount || 1;
                    const barWidth = `${Math.round((item.ReviewCount / maxCount) * 100)}%`;
                    const medal = MEDALS[index];
                    const isTop3 = index < 3;

                    return (
                        <View style={[styles.bookCard, isTop3 && styles.bookCardTop]}>
                            <View style={styles.rankContainer}>
                                {medal ? (
                                    <Text style={styles.medal}>{medal}</Text>
                                ) : (
                                    <Text style={styles.rank}>#{index + 1}</Text>
                                )}
                            </View>

                            <View style={styles.bookInfo}>
                                <Text style={styles.bookTitle} numberOfLines={2}>{item.TitleNormalized}</Text>
                                {item.Author ? (
                                    <Text style={styles.author} numberOfLines={1}>by {item.Author}</Text>
                                ) : null}

                                <View style={styles.barContainer}>
                                    <View style={[styles.bar, { width: barWidth }]} />
                                </View>

                                <View style={styles.countRow}>
                                    <Ionicons name="chatbubble-outline" size={12} color={COLORS.textMuted} />
                                    <Text style={styles.countText}>{item.ReviewCount} review{item.ReviewCount !== 1 ? 's' : ''}</Text>
                                </View>
                            </View>
                        </View>
                    );
                }}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No data found. Be the first to interact!</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: SPACING.base, paddingTop: SPACING.base, paddingBottom: SPACING.sm },
    headerTitle: { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.md,
        padding: 4,
        marginBottom: SPACING.sm,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: RADIUS.sm,
    },
    tabActive: {
        backgroundColor: COLORS.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: '600' },
    tabTextActive: { color: COLORS.primary },
    list: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.xxl },
    reviewWrapper: { marginBottom: SPACING.xs },
    rankBadge: {
        position: 'absolute',
        left: -8,
        top: 10,
        backgroundColor: COLORS.primary,
        width: 20,
        height: 20,
        borderRadius: 10,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.bg,
    },
    rankText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    bookCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
        padding: SPACING.base, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md,
    },
    bookCardTop: { borderColor: COLORS.accent + '55' },
    rankContainer: { width: 36, alignItems: 'center', paddingTop: 2 },
    medal: { fontSize: 24 },
    rank: { fontSize: FONTS.lg, fontWeight: '800', color: COLORS.textMuted },
    bookInfo: { flex: 1 },
    bookTitle: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
    author: { fontSize: FONTS.sm, color: COLORS.accent, marginBottom: SPACING.sm },
    barContainer: {
        height: 6, backgroundColor: COLORS.surfaceElevated,
        borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: SPACING.xs,
    },
    bar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.full },
    countRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    countText: { fontSize: FONTS.xs, color: COLORS.textMuted },
    emptyState: { alignItems: 'center', paddingTop: SPACING.xxl * 2 },
    emptyText: { color: COLORS.textMuted, fontSize: FONTS.base },
});

