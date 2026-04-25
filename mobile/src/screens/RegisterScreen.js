import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function RegisterScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!username.trim() || !email.trim() || !password.trim()) {
            return Alert.alert('Missing Fields', 'Please fill in all fields.');
        }
        if (password.length < 8) {
            return Alert.alert('Weak Password', 'Password must be at least 8 characters.');
        }
        setLoading(true);
        try {
            await api.post('/auth/register', { username, email, password });
            Alert.alert('Success!', 'Account created. Please sign in.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') },
            ]);
        } catch (err) {
            const msg = err.response?.data?.message || 'Registration failed.';
            Alert.alert('Error', msg);
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
                    <View style={styles.iconContainer}>
                        <Ionicons name="person-add" size={40} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join the reading community</Text>
                </View>

                <View style={styles.card}>
                    {[
                        { label: 'Username', value: username, setter: setUsername, icon: 'person-outline', placeholder: 'BookLover123', type: 'default' },
                        { label: 'Email', value: email, setter: setEmail, icon: 'mail-outline', placeholder: 'your@email.com', type: 'email-address' },
                    ].map((field) => (
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
                                    keyboardType={field.type}
                                    autoCapitalize={field.type === 'email-address' ? 'none' : 'words'}
                                    autoCorrect={false}
                                />
                            </View>
                        </View>
                    ))}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Min. 8 characters"
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
                        onPress={handleRegister}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.submitBtnText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.linkText}>Already have an account? <Text style={styles.linkHighlight}>Sign In</Text></Text>
                    </TouchableOpacity>
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
    iconContainer: {
        width: 70, height: 70, borderRadius: 18,
        backgroundColor: COLORS.primary + '22', borderWidth: 1,
        borderColor: COLORS.primary + '55', justifyContent: 'center',
        alignItems: 'center', marginBottom: SPACING.md,
    },
    title: { fontSize: FONTS.xxl, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: FONTS.base, color: COLORS.textMuted, marginTop: 4 },
    card: {
        backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
        padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border,
    },
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
        backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
        paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { fontSize: FONTS.base, fontWeight: '700', color: '#FFFFFF' },
    linkBtn: { alignItems: 'center', marginTop: SPACING.base },
    linkText: { fontSize: FONTS.sm, color: COLORS.textMuted },
    linkHighlight: { color: COLORS.primary, fontWeight: '600' },
});
