import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    Alert, Modal, ScrollView, RefreshControl, SafeAreaView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function AdminScreen() {
    const { username, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('queue');
    const [blockedReviews, setBlockedReviews] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSearch, setUserSearch] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [blockedRes, usersRes] = await Promise.all([
                api.get('/admin/blocked'),
                api.get('/admin/users'),
            ]);
            setBlockedReviews(blockedRes.data);
            setUsers(usersRes.data);
        } catch (_) {}
    }, []);

    useEffect(() => {
        (async () => {
            await fetchData();
            setLoading(false);
        })();
    }, [fetchData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleModerate = async (logId, reviewId, action) => {
        Alert.alert(
            `${action} Review`,
            `Are you sure you want to ${action.toLowerCase()} this review?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: action,
                    style: action === 'Delete' ? 'destructive' : 'default',
                    onPress: async () => {
                        try {
                            await api.post('/admin/moderate', { logId, reviewId, action: action === 'Delete' ? 'Deleted' : 'Approved' });
                            await fetchData();
                        } catch (_) {
                            Alert.alert('Error', 'Action failed.');
                        }
                    },
                },
            ]
        );
    };

    const handleBan = async (userId, banType) => {
        const labels = { 'unban': 'Unban', '24h': 'Ban 24h', '7d': 'Ban 7d', '30d': 'Ban 30d', 'permanent': 'Permanent Ban' };
        Alert.alert(`${labels[banType]} User`, 'Confirm this action?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm',
                style: banType === 'permanent' ? 'destructive' : 'default',
                onPress: async () => {
                    try {
                        await api.post('/admin/ban', { userId, banType });
                        await fetchData();
                        setSelectedUser(null);
                    } catch (_) {
                        Alert.alert('Error', 'Ban action failed.');
                    }
                },
            },
        ]);
    };

    const handleDeleteReview = async (reviewId) => {
        Alert.alert('Delete Review', 'Permanently delete this review?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/admin/reviews/${reviewId}`);
                        await fetchData();
                    } catch (_) {}
                },
            },
        ]);
    };

    const filteredUsers = users.filter(u =>
        !userSearch.trim() ||
        u.Username.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.Email.toLowerCase().includes(userSearch.toLowerCase())
    );

    if (loading) return <LoadingSpinner message="Loading admin panel..." />;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.headerTitle}>Admin Panel</Text>
                    <Text style={styles.headerSub}>@{username} — 2h session</Text>
                </View>
                <TouchableOpacity onPress={() => {
                    Alert.alert('Sign Out', 'End admin session?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Sign Out', style: 'destructive', onPress: logout },
                    ]);
                }}>
                    <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
                </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
                {[
                    { key: 'queue', label: 'Queue', icon: 'warning-outline', count: blockedReviews.length },
                    { key: 'directory', label: 'Directory', icon: 'people-outline', count: null },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
                        {tab.count !== null && (
                            <View style={[styles.tabBadge, tab.count > 0 && styles.tabBadgeActive]}>
                                <Text style={styles.tabBadgeText}>{tab.count}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'queue' ? (
                <FlatList
                    data={blockedReviews}
                    keyExtractor={item => item.LogID.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <View style={styles.queueCard}>
                            <View style={styles.queueHeader}>
                                <View style={styles.queueBookInfo}>
                                    <Ionicons name="book" size={14} color={COLORS.accent} />
                                    <Text style={styles.queueBookTitle} numberOfLines={1}>{item.TitleNormalized}</Text>
                                </View>
                                <Text style={styles.queueDate}>
                                    {new Date(item.DetectedAt).toLocaleDateString()}
                                </Text>
                            </View>
                            <Text style={styles.queueUser}>
                                <Text style={styles.queueUserLabel}>Submitted by: </Text>
                                @{item.Username} ({item.ViolationCount} violation{item.ViolationCount !== 1 ? 's' : ''})
                            </Text>
                            <View style={styles.queueComment}>
                                <Text style={styles.queueCommentText}>{item.OriginalComment}</Text>
                            </View>
                            <View style={styles.queueActions}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.approveBtn]}
                                    onPress={() => handleModerate(item.LogID, item.ReviewID, 'Approve')}
                                >
                                    <Ionicons name="checkmark" size={14} color={COLORS.success} />
                                    <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.deleteBtn]}
                                    onPress={() => handleModerate(item.LogID, item.ReviewID, 'Delete')}
                                >
                                    <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                                    <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.success} />
                            <Text style={styles.emptyText}>Moderation queue is clear!</Text>
                        </View>
                    }
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={16} color={COLORS.textMuted} style={{ marginRight: SPACING.xs }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search users..."
                            placeholderTextColor={COLORS.textMuted}
                            value={userSearch}
                            onChangeText={setUserSearch}
                        />
                    </View>
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={item => item.UserID.toString()}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.userCard}
                                onPress={() => setSelectedUser(item)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.userCardLeft}>
                                    <View style={[styles.userAvatar, item.IsBanned && styles.userAvatarBanned]}>
                                        <Text style={styles.userAvatarText}>{item.Username[0].toUpperCase()}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.userCardName}>{item.Username}</Text>
                                        <Text style={styles.userCardEmail} numberOfLines={1}>{item.Email}</Text>
                                        <View style={styles.userCardBadges}>
                                            <Text style={styles.userReviewCount}>{item.ReviewCount} reviews</Text>
                                            {item.ViolationCount > 0 && (
                                                <View style={styles.violationBadge}>
                                                    <Text style={styles.violationText}>{item.ViolationCount} violation{item.ViolationCount !== 1 ? 's' : ''}</Text>
                                                </View>
                                            )}
                                            {item.IsBanned ? (
                                                <View style={styles.bannedBadge}><Text style={styles.bannedBadgeText}>Banned</Text></View>
                                            ) : item.BannedUntil && new Date(item.BannedUntil) > new Date() ? (
                                                <View style={styles.tempBanBadge}><Text style={styles.tempBanBadgeText}>Temp. Ban</Text></View>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No users found.</Text>
                            </View>
                        }
                    />
                </View>
            )}

            {selectedUser && (
                <Modal visible animationType="slide" presentationStyle="pageSheet">
                    <SafeAreaView style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Registry Entry</Text>
                            <TouchableOpacity onPress={() => setSelectedUser(null)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={styles.modalScroll}>
                            <View style={styles.modalUserInfo}>
                                <View style={styles.avatarLarge}>
                                    <Text style={styles.avatarLargeText}>{selectedUser.Username[0].toUpperCase()}</Text>
                                </View>
                                <Text style={styles.modalUsername}>@{selectedUser.Username}</Text>
                                <Text style={styles.modalEmail}>{selectedUser.Email}</Text>
                            </View>

                            <View style={styles.modalStatsRow}>
                                {[
                                    { label: 'Reviews', value: selectedUser.ReviewCount },
                                    { label: 'Violations', value: selectedUser.ViolationCount },
                                    { label: 'Ban Count', value: selectedUser.BanCount || 0 },
                                ].map(stat => (
                                    <View key={stat.label} style={styles.modalStat}>
                                        <Text style={styles.modalStatNumber}>{stat.value}</Text>
                                        <Text style={styles.modalStatLabel}>{stat.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {selectedUser.FlaggedComments ? (
                                <View style={styles.flaggedSection}>
                                    <Text style={styles.flaggedTitle}>Violation History</Text>
                                    {selectedUser.FlaggedComments.split('|').map((entry, i) => (
                                        <View key={i} style={styles.flaggedEntry}>
                                            <Ionicons name="warning" size={14} color={COLORS.warning} />
                                            <Text style={styles.flaggedEntryText}>{entry.trim()}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            <Text style={styles.banSectionTitle}>Ban Actions</Text>
                            <View style={styles.banActions}>
                                {selectedUser.IsBanned || (selectedUser.BannedUntil && new Date(selectedUser.BannedUntil) > new Date()) ? (
                                    <TouchableOpacity
                                        style={[styles.banBtn, styles.unbanBtn]}
                                        onPress={() => handleBan(selectedUser.UserID, 'unban')}
                                    >
                                        <Text style={styles.banBtnText}>Unban User</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <>
                                        {['24h', '7d', '30d', 'permanent'].map(type => (
                                            <TouchableOpacity
                                                key={type}
                                                style={[styles.banBtn, type === 'permanent' ? styles.permanentBanBtn : styles.tempBanBtnStyle]}
                                                onPress={() => handleBan(selectedUser.UserID, type)}
                                            >
                                                <Text style={[styles.banBtnText, type === 'permanent' && { color: COLORS.danger }]}>
                                                    {type === 'permanent' ? 'Permanent Ban' : `Ban ${type}`}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </>
                                )}
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    headerRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: SPACING.base, paddingTop: SPACING.base, paddingBottom: SPACING.sm,
    },
    headerTitle: { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.text },
    headerSub: { fontSize: FONTS.xs, color: COLORS.textMuted },
    tabs: {
        flexDirection: 'row', paddingHorizontal: SPACING.base,
        gap: SPACING.sm, marginBottom: SPACING.base,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: SPACING.xs, backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md, paddingVertical: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border,
    },
    tabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
    tabText: { fontSize: FONTS.sm, color: COLORS.textMuted, fontWeight: '600' },
    tabTextActive: { color: COLORS.primary },
    tabBadge: {
        backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.full,
        paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center',
    },
    tabBadgeActive: { backgroundColor: COLORS.danger },
    tabBadgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
    list: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.xxl },
    queueCard: {
        backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
        padding: SPACING.base, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.warning + '44',
    },
    queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
    queueBookInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    queueBookTitle: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text, flex: 1 },
    queueDate: { fontSize: FONTS.xs, color: COLORS.textMuted },
    queueUser: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.sm },
    queueUserLabel: { fontWeight: '600' },
    queueComment: {
        backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.sm,
        padding: SPACING.sm, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: COLORS.warning,
    },
    queueCommentText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontStyle: 'italic' },
    queueActions: { flexDirection: 'row', gap: SPACING.sm },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm, borderWidth: 1,
    },
    approveBtn: { borderColor: COLORS.success + '55', backgroundColor: COLORS.success + '22' },
    deleteBtn: { borderColor: COLORS.danger + '55', backgroundColor: COLORS.danger + '22' },
    actionBtnText: { fontSize: FONTS.sm, fontWeight: '600' },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        marginHorizontal: SPACING.base, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md,
    },
    searchInput: { flex: 1, paddingVertical: SPACING.md, fontSize: FONTS.sm, color: COLORS.text },
    userCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
        padding: SPACING.md, marginBottom: SPACING.sm,
        borderWidth: 1, borderColor: COLORS.border,
    },
    userCardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
    userAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: COLORS.primary + '33', justifyContent: 'center', alignItems: 'center',
    },
    userAvatarBanned: { backgroundColor: COLORS.danger + '33' },
    userAvatarText: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.primary },
    userCardName: { fontSize: FONTS.base, fontWeight: '600', color: COLORS.text },
    userCardEmail: { fontSize: FONTS.xs, color: COLORS.textMuted, maxWidth: 180 },
    userCardBadges: { flexDirection: 'row', gap: 4, marginTop: 3, flexWrap: 'wrap' },
    userReviewCount: { fontSize: 10, color: COLORS.textMuted },
    violationBadge: {
        backgroundColor: COLORS.warning + '22', borderRadius: RADIUS.full,
        paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: COLORS.warning + '55',
    },
    violationText: { fontSize: 10, color: COLORS.warning, fontWeight: '600' },
    bannedBadge: {
        backgroundColor: COLORS.danger + '22', borderRadius: RADIUS.full,
        paddingHorizontal: 6, paddingVertical: 1,
    },
    bannedBadgeText: { fontSize: 10, color: COLORS.danger, fontWeight: '700' },
    tempBanBadge: {
        backgroundColor: COLORS.warning + '22', borderRadius: RADIUS.full,
        paddingHorizontal: 6, paddingVertical: 1,
    },
    tempBanBadgeText: { fontSize: 10, color: COLORS.warning, fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingTop: SPACING.xxl * 2, gap: SPACING.base },
    emptyText: { color: COLORS.textMuted, fontSize: FONTS.base },
    modal: { flex: 1, backgroundColor: COLORS.bg },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    modalTitle: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.text },
    modalScroll: { padding: SPACING.base },
    modalUserInfo: { alignItems: 'center', marginBottom: SPACING.xl },
    avatarLarge: {
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: COLORS.primary + '33', borderWidth: 2,
        borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md,
    },
    avatarLargeText: { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.primary },
    modalUsername: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.text },
    modalEmail: { fontSize: FONTS.sm, color: COLORS.textMuted, marginTop: 4 },
    modalStatsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
    modalStat: {
        flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    },
    modalStatNumber: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.primary },
    modalStatLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
    flaggedSection: { marginBottom: SPACING.xl },
    flaggedTitle: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
    flaggedEntry: {
        flexDirection: 'row', gap: SPACING.sm,
        backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.sm,
        padding: SPACING.sm, marginBottom: SPACING.xs, borderLeftWidth: 3, borderLeftColor: COLORS.warning,
    },
    flaggedEntryText: { fontSize: FONTS.xs, color: COLORS.textSecondary, flex: 1 },
    banSectionTitle: { fontSize: FONTS.md, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
    banActions: { gap: SPACING.sm },
    banBtn: {
        borderRadius: RADIUS.md, paddingVertical: SPACING.md,
        alignItems: 'center', borderWidth: 1,
    },
    unbanBtn: { backgroundColor: COLORS.success + '22', borderColor: COLORS.success + '55' },
    tempBanBtnStyle: { backgroundColor: COLORS.warning + '22', borderColor: COLORS.warning + '55' },
    permanentBanBtn: { backgroundColor: COLORS.danger + '22', borderColor: COLORS.danger + '55' },
    banBtnText: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text },
});
