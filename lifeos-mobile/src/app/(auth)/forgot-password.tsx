import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { authApi } from '../../api/auth'
import { Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import { useTheme, makeStyles } from '../../context/ThemeContext'
import Toast from 'react-native-toast-message'
import { Logo } from '../../components/Logo'

export default function ForgotPasswordScreen() {
  const { colors } = useTheme()
  const styles = useStyles()
  
  // Recovery Flow Step
  const [step, setStep] = useState(1) // 1 = Request code, 2 = Reset password
  
  // Step 1 Fields
  const [email, setEmail] = useState('')
  const [requestingCode, setRequestingCode] = useState(false)
  
  // Step 2 Fields
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)

  // Focused states for input borders
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const handleRequestCode = async () => {
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Email is required' })
      return
    }
    
    setRequestingCode(true)
    try {
      const res = await authApi.forgotPassword(email.trim())
      Toast.show({ 
        type: 'success', 
        text1: 'Reset code generated!', 
        text2: 'Use the code shown in the response to reset your password.'
      })
      
      // Auto-fill code if present in response (for ease of local phone testing)
      if (res && res.resetCode) {
        setCode(res.resetCode)
      }
      
      setStep(2)
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Could not send reset code', text2: e.message })
    } finally {
      setRequestingCode(false)
    }
  }

  const handleResetPassword = async () => {
    if (!code.trim()) {
      Toast.show({ type: 'error', text1: 'Verification code is required' })
      return
    }
    if (!newPassword) {
      Toast.show({ type: 'error', text1: 'New password is required' })
      return
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Passwords do not match' })
      return
    }

    setResettingPassword(true)
    try {
      await authApi.resetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword
      })
      Toast.show({ type: 'success', text1: 'Password reset successful!', text2: 'Please log in with your new password.' })
      router.replace('/(auth)/login')
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed to reset password', text2: e.message })
    } finally {
      setResettingPassword(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Back Arrow */}
        <TouchableOpacity style={styles.backBtn} onPress={() => step === 2 ? setStep(1) : router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        {/* Logo/Header */}
        <View style={styles.logoWrap}>
          <Logo size="md" />
          <Text style={[styles.logoText, { marginTop: Spacing.sm }]}>LifeOS</Text>
          <Text style={styles.logoSub}>Password Recovery</Text>
        </View>

        {step === 1 ? (
          /* STEP 1: REQUEST OTP */
          <View style={styles.card}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>Enter your email address below to receive a 6-digit reset code.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'email' && styles.inputFocused
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.ink[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleRequestCode} disabled={requestingCode}>
              {requestingCode ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Send Reset Code</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* STEP 2: VERIFY CODE & RESET */
          <View style={styles.card}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter the 6-digit code sent to {email} and choose a new password.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Reset Code</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'code' && styles.inputFocused,
                  { letterSpacing: 6, textAlign: 'center', fontWeight: 'bold', fontSize: FontSize.xl }
                ]}
                placeholder="000000"
                placeholderTextColor={colors.ink[400]}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                onFocus={() => setFocusedInput('code')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'newPassword' && styles.inputContainerFocused
              ]}>
                <TextInput
                  style={styles.inputField}
                  placeholder="••••••••"
                  placeholderTextColor={colors.ink[400]}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setFocusedInput('newPassword')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Text style={styles.toggleText}>{showNewPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'confirmPassword' && styles.inputContainerFocused
              ]}>
                <TextInput
                  style={styles.inputField}
                  placeholder="••••••••"
                  placeholderTextColor={colors.ink[400]}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedInput('confirmPassword')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Text style={styles.toggleText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleResetPassword} disabled={resettingPassword}>
              {resettingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendBtn} onPress={handleRequestCode} disabled={requestingCode}>
              <Text style={styles.resendText}>Didn't receive the code? Resend</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.soft },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: Spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  backArrow: { fontSize: FontSize.xl, color: colors.ink[700], fontWeight: 'bold' },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  logoText: { fontSize: FontSize.xxxl, fontWeight: '800', color: colors.ink[900] },
  logoSub: { fontSize: FontSize.sm, color: colors.ink[500], marginTop: 2, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: colors.ink[900] },
  subtitle: { fontSize: FontSize.sm, color: colors.ink[500], marginBottom: Spacing.lg, marginTop: 4, lineHeight: 20 },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: colors.ink[700], marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: colors.ink[900],
    backgroundColor: colors.surface.soft,
  },
  inputFocused: {
    borderColor: colors.brand[500],
    backgroundColor: colors.surface.white,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface.soft,
  },
  inputContainerFocused: {
    borderColor: colors.brand[500],
    backgroundColor: colors.surface.white,
  },
  inputField: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: colors.ink[900],
  },
  toggleBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  toggleText: {
    color: colors.brand[600],
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  resendBtn: { alignItems: 'center', marginTop: Spacing.md },
  resendText: { color: colors.brand[600], fontSize: FontSize.sm, fontWeight: '600' },
}))
