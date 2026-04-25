import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    SafeAreaView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import ReviewCard from '../components/ReviewCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function UserProfileScreen({ route, navigation }) {
    const { userId } = route.params;
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/users/${userId}`);
            setData(res.data);
        } catch (_) {}
    };

    useEffect(() => {
        (async () => {
            await fetchProfile();
            setLoading(false);
        })();
    }, [userId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProfile();
        setRefreshing(false);
    };

    if (loading) return <LoadingSpinner message="Loading profile..." />;
    if (!data) {
        return (
            <SafeAreaView style={styles.container}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.errorState}>
                    <Ionicons name="person-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.errorText}>User not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const { user, reviews } = data;
    const memberSince = new Date(user.CreatedAt).getFullYear();

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={reviews}
                keyExtractor={item => item.ReviewID.toString()}
                renderItem={({ item }) => <ReviewCard review={item} showLike={false} />}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListHeaderComponent={
                    <>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                            <Text style={styles.backText}>Back</Text>
                        </TouchableOpacity>

                        <View style={styles.profileHeader}>
                            <View style={styles.avatarLarge}>
                                <Text style={styles.avatarLargeText}>
                                    {user.Username[0].toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.username}>{user.Username}</Text>
                            <Text style={styles.memberSince}>Reader since {memberSince}</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>{user.TotalReviews || 0}</Text>
                                <Text style={styles.statLabel}>Reviews</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statNumber}>
                                    {user.AvgRating ? parseFloat(user.AvgRating).toFixed(1) : '—'}
                                </Text>
                                <Text style={styles.statLabel}>Avg Rating</Text>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Public Reviews</Text>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="book-outline" size={40} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No public reviews yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    backBtn: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
        paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    },
    backText: { fontSize: FONTS.base, color: COLORS.text },
    profileHeader: { alignItems: 'center', paddingVertical: SPACING.xl },
    avatarLarge: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: COLORS.primary + '33', borderWidth: 2,
        borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
        marginBottom: SPACING.md,
    },
    avatarLargeText: { fontSize: FONTS.xxxl, fontWeight: '800', color: COLORS.primary },
    username: { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.text },
    memberSince: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 4 },
    statsRow: {
        flexDirection: 'row', gap: SPACING.sm,
        marginHorizontal: SPACING.base, marginBottom: SPACING.xl,
    },
    statBox: {
        flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    },
    statNumber: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.primary },
    statLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
    sectionTitle: {
        fontSize: FONTS.lg, fontWeight: '700', color: COLORS.text,
        paddingHorizontal: SPACING.base, marginBottom: SPACING.sm,
    },
    list: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.xxl },
    emptyState: { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.base },
    emptyText: { color: COLORS.textMuted, fontSize: FONTS.base },
    errorState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.base },
    errorText: { color: COLORS.textMuted, fontSize: FONTS.base },
});
