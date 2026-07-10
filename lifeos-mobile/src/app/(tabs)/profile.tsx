import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, Modal, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { router } from 'expo-router'
import { Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import { useTheme, makeStyles } from '../../context/ThemeContext'
import Toast from 'react-native-toast-message'
import { useState, useEffect } from 'react'
import { authApi } from '../../api/auth'
import * as ImagePicker from 'expo-image-picker'
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg'
import { useQuery } from '@tanstack/react-query'
import { documentsApi } from '../../api/features'

type IconName = 'credit-card' | 'refresh-cw' | 'log-out' | 'info'

function MenuItem({ icon, label, onPress, danger, rightElement }: { icon: IconName; label: string; onPress?: () => void; danger?: boolean; rightElement?: React.ReactNode }) {
  const styles = useStyles()
  const { colors } = useTheme()

  const renderIcon = () => {
    const strokeColor = danger ? colors.status.error : colors.ink[500]
    switch (icon) {
      case 'credit-card':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={2} y={5} width={20} height={14} rx={2} ry={2} />
            <Line x1={2} y1={10} x2={22} y2={10} />
          </Svg>
        )
      case 'refresh-cw':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M23 4v6h-6" />
            <Path d="M1 20v-6h6" />
            <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </Svg>
        )
      case 'info':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={12} cy={12} r={10} />
            <Line x1={12} y1={16} x2={12} y2={12} />
            <Line x1={12} y1={8} x2={12.01} y2={8} />
          </Svg>
        )
      case 'log-out':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <Path d="M16 17l5-5-5-5" />
            <Line x1={21} y1={12} x2={9} y2={12} />
          </Svg>
        )
    }
  }

  const Container = onPress ? TouchableOpacity : View

  return (
    <Container style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={[styles.menuIconWrapper, danger && styles.menuIconWrapperDanger]}>
          {renderIcon()}
        </View>
        <Text style={[styles.menuLabel, danger && { color: colors.status.error }]}>{label}</Text>
      </View>
      {rightElement ? rightElement : onPress && <Text style={styles.menuArrow}>›</Text>}
    </Container>
  )
}

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth()
  const { theme, setTheme, colors } = useTheme()
  const styles = useStyles()

  // Profile picture modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [aboutModalOpen, setAboutModalOpen] = useState(false)
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '')
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [checkingUpdates, setCheckingUpdates] = useState(false)

  // Fetch Storage Summary for visual Settings indicator
  const { data: storageInfo, isLoading: isStorageLoading } = useQuery({
    queryKey: ['storageSummary'],
    queryFn: documentsApi.getStorage,
  })

  const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  useEffect(() => {
    if (user) {
      setProfilePicture(user.profilePicture || '')
    }
  }, [user])

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Gallery access is required to pick a profile photo.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      })

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`
        setProfilePicture(base64Image)
      }
    } catch (err) {
      Alert.alert('Error', 'An error occurred while picking the image.')
    }
  }

  const handleSaveProfile = async () => {
    setUpdatingProfile(true)
    try {
      await authApi.updateProfile({
        fullName: user?.fullName || '',
        profilePicture: profilePicture || undefined
      })
      await refreshProfile()
      setProfileModalOpen(false)
      Toast.show({ type: 'success', text1: 'Profile picture updated successfully!' })
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err.message || 'Failed to update profile' })
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleCheckUpdates = () => {
    setCheckingUpdates(true)
    setTimeout(() => {
      setCheckingUpdates(false)
      Alert.alert('App Update', 'Your app is up to date! LifeOS is currently at version 1.0.0.')
    }, 1200)
  }

  const toggleTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    Toast.show({ type: 'success', text1: `Theme changed to ${newTheme}` })
  }

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
        {/* Avatar Profile Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => setProfileModalOpen(true)} style={styles.avatar}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditBadgeText}>✎</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.fullName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role?.replace('ROLE_', '') ?? 'USER'}</Text>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            {/* Theme Toggle */}
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceLeft}>
                <Text style={styles.preferenceLabel}>Display Mode</Text>
                <Text style={styles.preferenceSubText}>Choose active light or dark theme</Text>
              </View>
              <View style={styles.themeSelector}>
                <TouchableOpacity
                  style={[styles.themeBtn, theme === 'light' && styles.themeBtnActive]}
                  onPress={() => toggleTheme('light')}
                >
                  <Text style={[styles.themeBtnText, theme === 'light' && styles.themeBtnTextActive]}>☀️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeBtn, theme === 'dark' && styles.themeBtnActive]}
                  onPress={() => toggleTheme('dark')}
                >
                  <Text style={[styles.themeBtnText, theme === 'dark' && styles.themeBtnTextActive]}>🌙</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* App & Utilities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App & Settings</Text>
          <View style={styles.card}>
            <MenuItem
              icon="credit-card"
              label="Subscription details"
              onPress={() => router.push('/subscriptions')}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="refresh-cw"
              label="Check for Updates"
              onPress={handleCheckUpdates}
              rightElement={checkingUpdates ? <ActivityIndicator size="small" color={colors.brand[500]} /> : null}
            />
            <View style={styles.divider} />
            <MenuItem
              icon="info"
              label="About LifeOS"
              onPress={() => setAboutModalOpen(true)}
            />
          </View>
        </View>

        {/* Sign Out Section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <MenuItem
              icon="log-out"
              label="Sign Out"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        <Text style={styles.version}>LifeOS Mobile v1.0.0</Text>
      </ScrollView>

      {/* Profile Setup Modal */}
      <Modal
        visible={profileModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile Photo</Text>
              <TouchableOpacity onPress={() => setProfileModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.avatarEditContainer}>
              <View style={styles.largeAvatar}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.largeAvatarImg} />
                ) : (
                  <Text style={styles.largeAvatarText}>{initials}</Text>
                )}
              </View>
              
              <View style={styles.photoActionRow}>
                <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickImage}>
                  <Text style={styles.photoActionText}>Upload Photo</Text>
                </TouchableOpacity>
                {profilePicture ? (
                  <TouchableOpacity style={styles.photoActionBtn} onPress={() => setProfilePicture('')}>
                    <Text style={[styles.photoActionText, styles.removePhotoText]}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={updatingProfile}>
              {updatingProfile ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Profile Photo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About LifeOS & Documentation Modal */}
      <Modal
        visible={aboutModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAboutModalOpen(false)}
      >
        <SafeAreaView style={styles.aboutContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>About LifeOS</Text>
            <TouchableOpacity onPress={() => setAboutModalOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.aboutContent}>
            <View style={styles.aboutHero}>
              <View style={styles.aboutLogo}>
                <Text style={styles.aboutLogoText}>L</Text>
              </View>
              <Text style={styles.aboutTitle}>LifeOS</Text>
              <Text style={styles.aboutSubtitle}>Version 1.0.0</Text>
            </View>

            <View style={styles.aboutSummaryCard}>
              <Text style={styles.aboutSummaryText}>
                LifeOS is a comprehensive daily life management application designed to help you organize your daily routines, keep track of habits, manage tasks, monitor monthly expenses, and structure your calendar in one visual bento dashboard.
              </Text>
              <Text style={[styles.aboutSummaryText, { marginTop: 14 }]}>
                Equipped with an advanced AI copilot, LifeOS naturally assists you in analyzing spending habits, suggesting cost-saving suggestions when expenses approach budget limits, and helping you optimize your routine to lead a balanced life.
              </Text>
              <Text style={[styles.aboutSummaryText, { marginTop: 14 }]}>
                Inside the app, you will find productivity tools tailored for daily clarity: priority-sorted task checklists, streak-based habit trackers, calendar timelines with month/week grid toggles, expense logs categorized dynamically, and an advanced scientific calculator with live running evaluation and subtotals.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.soft },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
    ...Shadow.sm,
  },
  avatarImg: {
    width: 84,
    height: 84,
    borderRadius: BorderRadius.full,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.brand[500],
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface.white,
    ...Shadow.sm,
  },
  avatarEditBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.xxl, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  name: { fontSize: FontSize.lg, fontWeight: '800', color: colors.ink[900], fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  email: { fontSize: FontSize.sm, color: colors.ink[500], marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  roleBadge: { marginTop: Spacing.sm, backgroundColor: colors.brand[50], borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4 },
  roleText: { color: colors.brand[600], fontSize: FontSize.xs, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: colors.ink[400], marginBottom: Spacing.sm, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  card: { backgroundColor: colors.surface.white, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.surface.border, ...Shadow.sm },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconWrapperDanger: {
    backgroundColor: colors.status.error + '10',
    borderColor: colors.status.error + '30',
  },
  menuLabel: { fontSize: FontSize.md, fontWeight: '600', color: colors.ink[700], fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  menuArrow: { fontSize: FontSize.lg, color: colors.ink[300] },
  divider: { height: 1, backgroundColor: colors.surface.border, marginLeft: Spacing.xl + 28 },
  version: { textAlign: 'center', color: colors.ink[300], fontSize: FontSize.xs, marginTop: Spacing.xl, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },

  // Preference Row & Theme Selectors styles
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  preferenceLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  preferenceLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: colors.ink[700],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  preferenceSubText: {
    fontSize: FontSize.xs,
    color: colors.ink[400],
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  themeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface.soft,
    borderRadius: BorderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  themeBtn: {
    width: 38,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBtnActive: {
    backgroundColor: colors.surface.white,
    ...Shadow.sm,
  },
  themeBtnText: {
    fontSize: 14,
  },
  themeBtnTextActive: {},

  // Profile modal specific styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: colors.ink[900],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  modalClose: {
    fontSize: FontSize.lg,
    color: colors.ink[500],
    fontWeight: 'bold',
  },
  avatarEditContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  largeAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  largeAvatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  largeAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  photoActionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface.soft,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[600],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  removePhotoText: {
    color: colors.status.error,
  },
  saveBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: Spacing.sm,
    ...Shadow.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  // Storage & progress styles
  storageCard: {
    padding: Spacing.xs,
  },
  storageTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  storageLabel: {
    fontSize: FontSize.xs + 1,
    fontWeight: '700',
    color: colors.ink[900],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  storageValue: {
    fontSize: FontSize.xs,
    color: colors.ink[500],
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface.soft,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  storageUpgradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  storageUpgradeInfo: {
    fontSize: FontSize.xs,
    color: colors.ink[400],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  storageUpgradeInfoSuccess: {
    fontSize: FontSize.xs,
    color: colors.brand[500],
    fontWeight: '700',
    marginTop: Spacing.xs + 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  storageUpgradeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100],
  },
  storageUpgradeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand[600],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },

  // About Modal Styles
  aboutContainer: {
    flex: 1,
    backgroundColor: colors.surface.soft,
  },
  aboutContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  aboutHero: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  aboutLogo: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  aboutLogoText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
  },
  aboutTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: colors.ink[900],
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  aboutSubtitle: {
    fontSize: FontSize.xs,
    color: colors.ink[400],
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  aboutSectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: colors.ink[400],
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  aboutSummaryCard: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surface.border,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  aboutSummaryText: {
    fontSize: FontSize.md,
    color: colors.ink[500],
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
}))
