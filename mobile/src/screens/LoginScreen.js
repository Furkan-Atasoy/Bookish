import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function LoginScreen({ navigation }) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            return Alert.alert('Missing Fields', 'Please enter your email and password.');
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password, isAdminRoute: false });
            await login(res.data.token, res.data.username, res.data.role);
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed. Please try again.';
            Alert.alert('Login Failed', msg);
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
                <View style={styles.hero}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="library" size={48} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Bookish</Text>
                    <Text style={styles.subtitle}>Your personal reading journal</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Welcome back</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="your@email.com"
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
                                placeholder="Your password"
                                placeholderTextColor={COLORS.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={18}
                                    color={COLORS.textMuted}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.submitBtnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkBtn}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text></Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.adminLinkBtn}
                        onPress={() => navigation.navigate('AdminLogin')}
                    >
                        <Ionicons name="shield-outline" size={14} color={COLORS.textMuted} />
                        <Text style={styles.adminLinkText}>Admin Portal</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.base },
    hero: { alignItems: 'center', marginBottom: SPACING.xxl },
    iconContainer: {
        width: 80, height: 80, borderRadius: 20,
        backgroundColor: COLORS.primary + '22', borderWidth: 1,
        borderColor: COLORS.primary + '55', justifyContent: 'center',
        alignItems: 'center', marginBottom: SPACING.base,
    },
    title: { fontSize: FONTS.xxxl, fontWeight: '800', color: COLORS.text, letterSpacing: -1 },
    subtitle: { fontSize: FONTS.base, color: COLORS.textMuted, marginTop: 4 },
    card: {
        backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
        padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border,
    },
    cardTitle: { fontSize: FONTS.xl, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xl },
    inputGroup: { marginBottom: SPACING.base },
    label: { fontSize: FONTS.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.xs },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md,
        borderWidth: 1, borderColor: COLORS.border,
    },
    inputIcon: { paddingHorizontal: SPACING.md },
    input: {
        flex: 1, paddingVertical: SPACING.md, paddingRight: SPACING.md,
        fontSize: FONTS.base, color: COLORS.text,
    },
    eyeBtn: { paddingHorizontal: SPACING.md },
    submitBtn: {
        backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { fontSize: FONTS.base, fontWeight: '700', color: '#FFFFFF' },
    linkBtn: { alignItems: 'center', marginTop: SPACING.base },
    linkText: { fontSize: FONTS.sm, color: COLORS.textMuted },
    linkHighlight: { color: COLORS.primary, fontWeight: '600' },
    adminLinkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm, gap: 4 },
    adminLinkText: { fontSize: FONTS.xs, color: COLORS.textMuted },
});
