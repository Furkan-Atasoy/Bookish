import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity,
    Alert, Modal, Switch, RefreshControl, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ReviewCard from '../components/ReviewCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function ProfileScreen() {
    const { username, logout } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [rating, setRating] = useState('');
    const [comment, setComment] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchMyReviews = useCallback(async () => {
        try {
            const res = await api.get('/reviews/me');
            setReviews(res.data);
        } catch (_) {}
    }, []);

    useEffect(() => {
        (async () => {
            await fetchMyReviews();
            setLoading(false);
        })();
    }, [fetchMyReviews]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMyReviews();
        setRefreshing(false);
    };

    const handleSubmit = async () => {
        const ratingNum = parseInt(rating);
        if (!title.trim()) return Alert.alert('Missing Field', 'Please enter a book title.');
        if (!rating || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 10) {
            return Alert.alert('Invalid Rating', 'Rating must be between 1 and 10.');
        }

        setSubmitting(true);
        try {
            const res = await api.post('/reviews', {
                title: title.trim(),
                author: author.trim() || undefined,
                rating: ratingNum,
                comment: comment.trim(),
                visibility: isPublic ? 'Public' : 'Private',
            });

            const status = res.data.status;
            if (status === 'PermanentlyBanned' || status === 'AutoBanned') {
                Alert.alert('Account Suspended', res.data.message);
                await logout();
                return;
            }

            if (status === 'Blocked') {
                Alert.alert('Review Flagged', res.data.message);
            } else {
                Alert.alert('Success!', 'Your review has been posted.');
            }

            setTitle('');
            setAuthor('');
            setRating('');
            setComment('');
            setIsPublic(true);
            setShowAddModal(false);
            await fetchMyReviews();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to post review.');
        } finally {
            setSubmitting(false);
        }
    };

    const publicCount = reviews.filter(r => r.Visibility === 'Public' && r.Status === 'Published').length;
    const avgRating = reviews.length
        ? (reviews.reduce((s, r) => s + r.Rating, 0) / reviews.length).toFixed(1)
        : '—';

    if (loading) return <LoadingSpinner message="Loading your diary..." />;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.headerTitle}>My Diary</Text>
                    <Text style={styles.headerSub}>@{username}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                        <Ionicons name="add" size={20} color={COLORS.text} />
                        <Text style={styles.addBtnText}>Add Review</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutBtn} onPress={() => {
                        Alert.alert('Sign Out', 'Are you sure?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Sign Out', style: 'destructive', onPress: logout },
                        ]);
                    }}>
                        <Ionicons name="log-out-outline" size={22} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{reviews.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{publicCount}</Text>
                    <Text style={styles.statLabel}>Public</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{avgRating}</Text>
                    <Text style={styles.statLabel}>Avg Rating</Text>
                </View>
            </View>

            <FlatList
                data={reviews}
                keyExtractor={item => item.ReviewID.toString()}
                renderItem={({ item }) => (
                    <View style={styles.reviewWrapper}>
                        <ReviewCard review={item} showLike={false} />
                        <View style={styles.reviewMeta}>
                            <View style={[styles.badge, item.Visibility === 'Private' ? styles.badgePrivate : styles.badgePublic]}>
                                <Ionicons name={item.Visibility === 'Private' ? 'lock-closed' : 'globe-outline'} size={10} color={item.Visibility === 'Private' ? COLORS.warning : COLORS.success} />
                                <Text style={[styles.badgeText, { color: item.Visibility === 'Private' ? COLORS.warning : COLORS.success }]}>{item.Visibility}</Text>
                            </View>
                            {item.Status === 'Blocked' && (
                                <View style={[styles.badge, styles.badgeBlocked]}>
                                    <Ionicons name="warning" size={10} color={COLORS.danger} />
                                    <Text style={[styles.badgeText, { color: COLORS.danger }]}>Under Review</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No reviews yet.</Text>
                        <Text style={styles.emptyHint}>Tap "Add Review" to start your reading diary!</Text>
                    </View>
                }
            />

            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
                <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Book Review</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        {[
                            { label: 'Book Title *', value: title, setter: setTitle, placeholder: 'e.g. The Great Gatsby', icon: 'book-outline' },
                            { label: 'Author (optional)', value: author, setter: setAuthor, placeholder: 'e.g. F. Scott Fitzgerald', icon: 'person-outline' },
                            { label: 'Rating (1–10) *', value: rating, setter: setRating, placeholder: '8', icon: 'star-outline', keyboard: 'numeric' },
                        ].map(field => (
                            <View key={field.label} style={styles.inputGroup}>
                                <Text style={styles.label}>{field.label}</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name={field.icon} size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder={field.placeholder}
                                        placeholderTextColor={COLORS.textMuted}
                                        value={field.value}
                                        onChangeText={field.setter}
                                        keyboardType={field.keyboard || 'default'}
                                    />
                                </View>
                            </View>
                        ))}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Review (optional)</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="Share your thoughts about this book..."
                                placeholderTextColor={COLORS.textMuted}
                                value={comment}
                                onChangeText={setComment}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={styles.toggleRow}>
                            <View>
                                <Text style={styles.label}>Visibility</Text>
                                <Text style={styles.toggleSub}>{isPublic ? 'Visible to the community' : 'Only visible to you'}</Text>
                            </View>
                            <View style={styles.toggleRight}>
                                <Ionicons name={isPublic ? 'globe-outline' : 'lock-closed-outline'} size={16} color={isPublic ? COLORS.success : COLORS.textMuted} />
                                <Switch
                                    value={isPublic}
                                    onValueChange={setIsPublic}
                                    trackColor={{ false: COLORS.border, true: COLORS.primary + '88' }}
                                    thumbColor={isPublic ? COLORS.primary : COLORS.textMuted}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            <Text style={styles.submitBtnText}>{submitting ? 'Posting...' : 'Post Review'}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
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
    headerSub: { fontSize: FONTS.sm, color: COLORS.textMuted },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    },
    addBtnText: { fontSize: FONTS.sm, fontWeight: '700', color: COLORS.text },
    logoutBtn: { padding: SPACING.xs },
    statsRow: {
        flexDirection: 'row', gap: SPACING.sm,
        paddingHorizontal: SPACING.base, marginBottom: SPACING.base,
    },
    statBox: {
        flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    },
    statNumber: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.primary },
    statLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
    reviewWrapper: { position: 'relative' },
    reviewMeta: {
        flexDirection: 'row', gap: SPACING.xs,
        paddingHorizontal: SPACING.base, marginTop: -SPACING.sm, marginBottom: SPACING.xs,
    },
    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: SPACING.sm, paddingVertical: 2,
        borderRadius: RADIUS.full, borderWidth: 1,
    },
    badgePublic: { backgroundColor: COLORS.success + '22', borderColor: COLORS.success + '55' },
    badgePrivate: { backgroundColor: COLORS.warning + '22', borderColor: COLORS.warning + '55' },
    badgeBlocked: { backgroundColor: COLORS.danger + '22', borderColor: COLORS.danger + '55' },
    badgeText: { fontSize: 10, fontWeight: '600' },
    list: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.xxl },
    emptyState: { alignItems: 'center', paddingTop: SPACING.xxl * 2, gap: SPACING.sm },
    emptyText: { fontSize: FONTS.md, color: COLORS.textSecondary, fontWeight: '600' },
    emptyHint: { fontSize: FONTS.sm, color: COLORS.textMuted, textAlign: 'center' },
    modal: { flex: 1, backgroundColor: COLORS.bg },
    modalScroll: { padding: SPACING.base },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    modalTitle: { fontSize: FONTS.xl, fontWeight: '800', color: COLORS.text },
    inputGroup: { marginBottom: SPACING.base },
    label: { fontSize: FONTS.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border,
    },
    inputIcon: { paddingHorizontal: SPACING.md },
    input: { flex: 1, paddingVertical: SPACING.md, paddingRight: SPACING.md, fontSize: FONTS.base, color: COLORS.text },
    textArea: {
        backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border,
        padding: SPACING.md, fontSize: FONTS.base, color: COLORS.text,
        minHeight: 100,
    },
    toggleRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
        padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl,
    },
    toggleSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
    toggleRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    submitBtn: {
        backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        paddingVertical: SPACING.md, alignItems: 'center',
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { fontSize: FONTS.base, fontWeight: '700', color: COLORS.text },
});
