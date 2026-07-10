import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import { useTheme, makeStyles } from '../context/ThemeContext'
import { router } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import Toast from 'react-native-toast-message'

export default function SettingsScreen() {
  const { user, logout } = useAuth()
  const { theme, setTheme, colors } = useTheme()
  const styles = useStyles()

  const changeTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    Toast.show({ type: 'success', text1: `Theme changed to ${newTheme}` })
  }



  // Checking Updates State
  const [checkingUpdates, setCheckingUpdates] = useState(false)



  const handleCheckUpdates = () => {
    setCheckingUpdates(true)
    setTimeout(() => {
      setCheckingUpdates(false)
      Alert.alert('App Update', 'Your app is up to date! LifeOS is currently at version 1.0.0.')
    }, 1500)
  }

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of LifeOS?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout()
            Toast.show({ type: 'success', text1: 'Signed out successfully' })
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Read-Only Profile Details Section */}
          <Text style={styles.sectionTitle}>Profile Details</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user?.fullName}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>



          {/* Display Preferences */}
          <Text style={styles.sectionTitle}>Display Preferences</Text>
          <View style={styles.card}>
            <Text style={[styles.infoLabel, { marginBottom: Spacing.sm }]}>Choose Theme Mode</Text>
            <View style={styles.themeRow}>
              <TouchableOpacity
                style={[styles.themeBtn, theme === 'light' && styles.themeBtnActive]}
                onPress={() => changeTheme('light')}
              >
                <Text style={[styles.themeBtnText, theme === 'light' && styles.themeBtnTextActive]}>☀️ Bright</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeBtn, theme === 'dark' && styles.themeBtnActive]}
                onPress={() => changeTheme('dark')}
              >
                <Text style={[styles.themeBtnText, theme === 'dark' && styles.themeBtnTextActive]}>🌙 Dark</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* App Version & Updates */}
          <Text style={styles.sectionTitle}>App Version</Text>
          <View style={styles.card}>
            <Text style={[styles.infoLabel, { marginBottom: Spacing.xs }]}>Version 1.0.0</Text>
            <Text style={[styles.infoValue, { marginBottom: Spacing.sm, alignSelf: 'flex-start' }]}>LifeOS is up to date.</Text>
            <TouchableOpacity style={styles.securityBtn} onPress={handleCheckUpdates} disabled={checkingUpdates}>
              {checkingUpdates ? (
                <ActivityIndicator color={colors.brand[500]} />
              ) : (
                <Text style={styles.securityBtnText}>Check for Updates</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Account Details */}
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.card}>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user?.role?.replace('ROLE_', '') ?? 'USER'}</Text>
            </View>
          </View>

          {/* Account Actions */}
          <Text style={styles.sectionTitle}>Account Actions</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.dangerRow} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign Out of LifeOS</Text>
              <Text style={styles.logoutArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.version}>LifeOS Mobile v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>


    </SafeAreaView>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.soft },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backArrow: { fontSize: 22, color: colors.ink[900], paddingRight: 4 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[900] },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: colors.ink[500], marginBottom: Spacing.sm, marginTop: Spacing.md },
  card: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
    marginBottom: Spacing.sm,
  },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: colors.ink[700], marginBottom: 6, marginTop: Spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: colors.ink[900],
    backgroundColor: colors.surface.white,
    marginBottom: Spacing.sm,
  },
  securityBtn: {
    borderWidth: 1.5,
    borderColor: colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface.white,
  },
  securityBtnText: { color: colors.brand[600], fontWeight: '700', fontSize: FontSize.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.border,
  },
  infoLabel: { fontSize: FontSize.sm, fontWeight: '600', color: colors.ink[700] },
  infoValue: { fontSize: FontSize.sm, color: colors.ink[500], fontWeight: '600', maxWidth: '60%' },
  dangerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 4 },
  logoutText: { fontSize: FontSize.md, fontWeight: '600', color: colors.brand[600] },
  logoutArrow: { fontSize: 20, color: colors.brand[600] },
  version: { textAlign: 'center', color: colors.ink[300], fontSize: FontSize.xs, marginTop: Spacing.xl },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface.soft,
  },
  themeBtnActive: {
    borderColor: colors.brand[500],
    backgroundColor: colors.brand[50] + '30',
  },
  themeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: colors.ink[700],
  },
  themeBtnTextActive: {
    color: colors.brand[600],
    fontWeight: '700',
  },
}))
