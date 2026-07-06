import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import { router } from 'expo-router'
import { useAuth } from '../context/AuthContext'
import { apiPut } from '../api/client'
import Toast from 'react-native-toast-message'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function SettingsScreen() {
  const { user, logout } = useAuth()
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    AsyncStorage.getItem('theme').then(val => {
      if (val) setTheme(val)
    })
  }, [])

  const changeTheme = async (newTheme: string) => {
    setTheme(newTheme)
    await AsyncStorage.setItem('theme', newTheme)
    if (Platform.OS === 'web') {
      if (newTheme === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      window.dispatchEvent(new Event('storage'))
    }
    Toast.show({ type: 'success', text1: `Theme changed to ${newTheme}` })
  }

  // Change Password Fields
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // Checking Updates State
  const [checkingUpdates, setCheckingUpdates] = useState(false)

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      Toast.show({ type: 'error', text1: 'Password cannot be empty' })
      return
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' })
      return
    }

    setSavingPassword(true)
    try {
      await apiPut('/users/me', {
        fullName: user?.fullName || '',
        email: user?.email,
        password: newPassword.trim(),
      })
      Toast.show({ type: 'success', text1: 'Password updated successfully' })
      setPasswordModalOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.message || 'Could not update password' })
    } finally {
      setSavingPassword(false)
    }
  }

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

          {/* Security Section */}
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <Text style={[styles.infoLabel, { marginBottom: Spacing.sm }]}>Update Password</Text>
            <TouchableOpacity style={styles.securityBtn} onPress={() => setPasswordModalOpen(true)}>
              <Text style={styles.securityBtnText}>Change Password</Text>
            </TouchableOpacity>
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
                <ActivityIndicator color={Colors.brand[500]} />
              ) : (
                <Text style={styles.securityBtnText}>Check for Updates</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Account Details */}
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user?.role?.replace('ROLE_', '') ?? 'USER'}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={[styles.infoValue, { fontSize: FontSize.xs }]} numberOfLines={1}>{user?.id}</Text>
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

      {/* Change Password Modal */}
      <Modal visible={passwordModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPasswordModalOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => setPasswordModalOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>New Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new password..."
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
              placeholderTextColor={Colors.ink[400]}
            />

            <Text style={styles.label}>Confirm New Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password..."
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              placeholderTextColor={Colors.ink[400]}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleUpdatePassword} disabled={savingPassword}>
              {savingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.soft },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backArrow: { fontSize: 22, color: Colors.ink[900], paddingRight: 4 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink[500], marginBottom: Spacing.sm, marginTop: Spacing.md },
  card: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
    marginBottom: Spacing.sm,
  },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink[700], marginBottom: 6, marginTop: Spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.ink[200],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    color: Colors.ink[900],
    backgroundColor: Colors.surface.soft,
    marginBottom: Spacing.sm,
  },
  securityBtn: {
    borderWidth: 1.5,
    borderColor: Colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surface.white,
  },
  securityBtnText: { color: Colors.brand[600], fontWeight: '700', fontSize: FontSize.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.border,
  },
  infoLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink[700] },
  infoValue: { fontSize: FontSize.sm, color: Colors.ink[500], fontWeight: '600', maxWidth: '60%' },
  dangerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 4 },
  logoutText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.brand[600] },
  logoutArrow: { fontSize: 20, color: Colors.brand[600] },
  version: { textAlign: 'center', color: Colors.ink[300], fontSize: FontSize.xs, marginTop: Spacing.xl },
  themeRow: { flexDirection: 'row', gap: Spacing.sm },
  themeBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.ink[200],
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surface.soft,
  },
  themeBtnActive: {
    borderColor: Colors.brand[500],
    backgroundColor: Colors.brand[50] + '30',
  },
  themeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.ink[700],
  },
  themeBtnTextActive: {
    color: Colors.brand[600],
    fontWeight: '700',
  },
  modal: {
    flex: 1,
    padding: Spacing.xl,
    backgroundColor: Colors.surface.soft,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.ink[900],
  },
  modalClose: {
    fontSize: 18,
    color: Colors.ink[500],
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: Colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
})
