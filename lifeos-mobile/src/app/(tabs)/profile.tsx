import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { router } from 'expo-router'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import Toast from 'react-native-toast-message'

function MenuItem({ emoji, label, onPress, danger }: { emoji: string; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <Text style={[styles.menuLabel, danger && { color: Colors.status.error }]}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  )
}

export default function ProfileScreen() {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login') } },
    ])
  }

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role?.replace('ROLE_', '') ?? 'USER'}</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <MenuItem emoji="👤" label="Edit Profile" onPress={() => router.push('/settings')} />
            <View style={styles.divider} />
            <MenuItem emoji="🔒" label="Change Password" onPress={() => router.push('/settings')} />
            <View style={styles.divider} />
            <MenuItem emoji="🔔" label="Notifications" onPress={() => Toast.show({ type: 'info', text1: 'Notification settings coming soon' })} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.card}>
            <MenuItem emoji="💳" label="Subscriptions" onPress={() => router.push('/subscriptions')} />
            <View style={styles.divider} />
            <MenuItem emoji="⚙️" label="Settings" onPress={() => router.push('/settings')} />
            <View style={styles.divider} />
            <MenuItem emoji="ℹ️" label="About LifeOS" onPress={() => Toast.show({ type: 'info', text1: 'LifeOS Mobile v1.0.0' })} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <MenuItem emoji="🚪" label="Sign Out" onPress={handleLogout} danger />
          </View>
        </View>

        <Text style={styles.version}>LifeOS Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.soft },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.xxl },
  name: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  email: { fontSize: FontSize.sm, color: Colors.ink[500], marginTop: 4 },
  roleBadge: { marginTop: Spacing.sm, backgroundColor: Colors.brand[50], borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { color: Colors.brand[600], fontSize: FontSize.xs, fontWeight: '700' },
  section: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink[500], marginBottom: Spacing.sm, marginLeft: 4 },
  card: { backgroundColor: Colors.surface.white, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  menuEmoji: { fontSize: 20, marginRight: Spacing.md },
  menuLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.ink[900] },
  menuArrow: { fontSize: 20, color: Colors.ink[300] },
  divider: { height: 1, backgroundColor: Colors.surface.border, marginLeft: 52 },
  version: { textAlign: 'center', color: Colors.ink[300], fontSize: FontSize.xs, marginTop: Spacing.lg },
})
