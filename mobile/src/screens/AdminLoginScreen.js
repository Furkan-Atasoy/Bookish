import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function AdminLoginScreen({ navigation }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            return Alert.alert('Missing Fields', 'Please enter credentials.');
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password, isAdminRoute: true });
            await login(res.data.token, res.data.username, res.data.role);
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed.';
            Alert.alert('Access Denied', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>

                <View style={styles.hero}>
                    <View style={styles.shieldContainer}>
                        <Ionicons name="shield" size={48} color={COLORS.danger} />
                    </View>
                    <Text style={styles.title}>Admin Portal</Text>
                    <Text style={styles.subtitle}>Secure administrative access</Text>
                    <View style={styles.warningBadge}>
                        <Ionicons name="warning-outline" size={14} color={COLORS.warning} />
                        <Text style={styles.warningText}>Restricted — Admin accounts only</Text>
                    </View>
                </View>

                <View style={[styles.card, styles.cardDanger]}>
                    <Text style={styles.cardTitle}>Administrator Sign In</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Admin Email</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="admin@bookish.com"
                                placeholderTextColor={COLORS.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Admin password"
                                placeholderTextColor={COLORS.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginRight: SPACING.xs }} />
                        <Text style={styles.submitBtnText}>{loading ? 'Authenticating...' : 'Secure Access'}</Text>
                    </TouchableOpacity>

                    <Text style={styles.securityNote}>
                        Session expires after 2 hours. All actions are logged.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { flexGrow: 1, padding: SPACING.base, paddingTop: SPACING.xxl },
    backBtn: { marginBottom: SPACING.base, alignSelf: 'flex-start' },
    hero: { alignItems: 'center', marginBottom: SPACING.xl },
    shieldContainer: {
        width: 80, height: 80, borderRadius: 20,
        backgroundColor: COLORS.danger + '22', borderWidth: 1,
        borderColor: COLORS.danger + '55', justifyContent: 'center',
        alignItems: 'center', marginBottom: SPACING.md,
    },
    title: { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: FONTS.base, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.md },
    warningBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: COLORS.warning + '22', borderWidth: 1,
        borderColor: COLORS.warning + '55', borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md, paddingVertical: 5,
    },
    warningText: { fontSize: FONTS.xs, color: COLORS.warning, fontWeight: '600' },
    card: {
        backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
        padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border,
    },
    cardDanger: { borderColor: COLORS.danger + '44' },
    cardTitle: { fontSize: FONTS.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xl },
    inputGroup: { marginBottom: SPACING.base },
    label: { fontSize: FONTS.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border,
    },
    inputIcon: { paddingHorizontal: SPACING.md },
    input: { flex: 1, paddingVertical: SPACING.md, paddingRight: SPACING.md, fontSize: FONTS.base, color: COLORS.text },
    eyeBtn: { paddingHorizontal: SPACING.md },
    submitBtn: {
        backgroundColor: COLORS.danger, borderRadius: RADIUS.md,
        paddingVertical: SPACING.md, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { fontSize: FONTS.base, fontWeight: '700', color: '#FFFFFF' },
    securityNote: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.base },
});
