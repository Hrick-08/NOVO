import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Image,
    TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Circle, Path, Svg } from 'react-native-svg';
import { router, useNavigation } from 'expo-router';
import { Colors } from '@/config/theme';
import { useAppStore } from '@/store/useAppStore';
import { getProfile, logout, ProfileData, Redemption } from '@/hooks/useApi';

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const statusColor = (s: string) =>
    s === 'completed' ? '#4ADE80' : s === 'pending' ? '#FACC15' : '#94A3B8';

function StatCard({ label, value, colors }: { label: string; value: string; colors: typeof Colors.dark }) {
    return (
        <View style={[styles.statCard, { backgroundColor: colors.border + '33' }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>{label}</Text>
        </View>
    );
}

function RedemptionRow({ item, colors }: { item: Redemption; colors: typeof Colors.dark }) {
    return (
        <View style={[styles.redemptionRow, { borderBottomColor: colors.border }]}>
            <View style={styles.redemptionLeft}>
                <Text style={[styles.redemptionName, { color: colors.text }]} numberOfLines={1}>{item.item_name}</Text>
                <Text style={[styles.redemptionMeta, { color: colors.icon }]}>{item.item_type} · {formatDate(item.created_at)}</Text>
            </View>
            <View style={styles.redemptionRight}>
                <Text style={[styles.redemptionCoins, { color: colors.tint }]}>-{item.coins_spent} 🪙</Text>
                <Text style={[styles.redemptionStatus, { color: statusColor(item.status) }]}>{item.status}</Text>
            </View>
        </View>
    );
}

export default function ProfileScreen() {
    const colors = Colors.dark;
    const { user, setUser } = useAppStore();
    const userId = user?.id;
    const navigation = useNavigation();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    const fetchProfile = useCallback(async (forceRefresh = false) => {
        if (!userId) return;
        try {
            forceRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);
            const data = await getProfile(userId, forceRefresh);
            setProfile(data);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load profile');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userId]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive',
                onPress: async () => {
                    setLoggingOut(true);
                    try {
                        const userId = user?.id;
                        console.log('Starting logout for user:', userId);

                        // 1. Call backend logout endpoint + wipe AsyncStorage
                        await logout(userId);
                        console.log('Backend logout successful, storage cleared');

                        // 2. Reset Zustand store
                        setUser(null);
                        console.log('Zustand store cleared');

                        // 3. Small delay and then navigate
                        setLoggingOut(false);
                        await new Promise(resolve => setTimeout(resolve, 200));

                        // 4. Force reset to root 'index' stack directly, bypassing URL ambiguity
                        console.log('Navigating to login screen');
                        const rootNav = navigation.getParent();
                        if (rootNav) {
                            rootNav.reset({
                                index: 0,
                                routes: [{ name: 'index', params: { logout: 'true' } }],
                            });
                        } else {
                            router.replace('/?logout=true' as any);
                        }
                    } catch (err) {
                        console.log('Logout error:', err);
                        setLoggingOut(false);
                        Alert.alert('Error', 'Logout failed. Please try again.');
                    }
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    if (error || !profile) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
                    <Circle cx={12} cy={12} r={10} stroke={colors.icon} strokeWidth={1.5} />
                    <Path d="M12 8v4M12 16h.01" stroke={colors.icon} strokeWidth={1.8} strokeLinecap="round" />
                </Svg>
                <Text style={[styles.errorText, { color: colors.icon }]}>{error ?? 'Something went wrong'}</Text>
                <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.tint }]} onPress={() => fetchProfile(true)}>
                    <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const initials = profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={styles.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProfile(true)} tintColor={colors.tint} />}
        >
            <View style={styles.avatarSection}>
                {profile.avatar_url
                    ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    : (
                        <View style={[styles.avatarFallback, { backgroundColor: colors.tint + '22' }]}>
                            <Text style={[styles.avatarInitials, { color: colors.tint }]}>{initials}</Text>
                        </View>
                    )
                }
                <Text style={[styles.name, { color: colors.text }]}>{profile.name}</Text>
                <Text style={[styles.email, { color: colors.icon }]}>{profile.email}</Text>
                {profile.phone ? <Text style={[styles.phone, { color: colors.icon }]}>{profile.phone}</Text> : null}
                <Text style={[styles.memberSince, { color: colors.icon }]}>Member since {formatDate(profile.member_since)}</Text>
            </View>

            <View style={styles.statsRow}>
                <StatCard label="Total Spent" value={formatCurrency(profile.stats.total_spent_inr)} colors={colors} />
                <StatCard label="Coins Earned" value={profile.stats.total_coins_earned.toLocaleString('en-IN')} colors={colors} />
                <StatCard label="Transactions" value={String(profile.stats.total_transactions)} colors={colors} />
            </View>

            <View style={[styles.coinsCard, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '44' }]}>
                <Text style={[styles.coinsLabel, { color: colors.icon }]}>Nova Coins Balance</Text>
                <Text style={[styles.coinsValue, { color: colors.tint }]}>🪙 {profile.nova_coins.toLocaleString('en-IN')}</Text>
            </View>

            <View style={[styles.section, { backgroundColor: colors.border + '22' }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Redemptions</Text>
                {profile.recent_redemptions.length === 0
                    ? <Text style={[styles.emptyText, { color: colors.icon }]}>No redemptions yet</Text>
                    : profile.recent_redemptions.map((item) => <RedemptionRow key={item.id} item={item} colors={colors} />)
                }
            </View>

            <TouchableOpacity
                style={[styles.logoutBtn, { borderColor: '#EF4444' }]}
                onPress={handleLogout}
                disabled={loggingOut}
                activeOpacity={0.7}
            >
                <Text style={[styles.logoutText, { color: '#EF4444' }]}>
                    {loggingOut ? 'Logging out…' : 'Log Out'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { paddingBottom: 100, paddingHorizontal: 16, paddingTop: 20, gap: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    errorText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 4 },
    retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    avatarSection: { alignItems: 'center', gap: 4, paddingVertical: 8 },
    avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
    avatarFallback: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    avatarInitials: { fontSize: 28, fontWeight: '700' },
    name: { fontSize: 20, fontWeight: '700' },
    email: { fontSize: 13 },
    phone: { fontSize: 13 },
    memberSince: { fontSize: 12, marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
    statLabel: { fontSize: 11, textAlign: 'center' },
    coinsCard: { borderRadius: 12, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', gap: 4 },
    coinsLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    coinsValue: { fontSize: 26, fontWeight: '800' },
    section: { borderRadius: 12, padding: 16, gap: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
    emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
    redemptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    redemptionLeft: { flex: 1, gap: 2 },
    redemptionName: { fontSize: 14, fontWeight: '500' },
    redemptionMeta: { fontSize: 12 },
    redemptionRight: { alignItems: 'flex-end', gap: 2 },
    redemptionCoins: { fontSize: 14, fontWeight: '600' },
    redemptionStatus: { fontSize: 11, textTransform: 'capitalize' },
    logoutBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    logoutText: { fontSize: 15, fontWeight: '600' },
});