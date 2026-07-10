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
import { Link, router } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import { useTheme, makeStyles } from '../../context/ThemeContext'
import Toast from 'react-native-toast-message'
import { Logo } from '../../components/Logo'

export default function LoginScreen() {
  const { login } = useAuth()
  const { colors } = useTheme()
  const styles = useStyles()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' })
      return
    }
    setLoading(true)
    try {
      await login({ email: email.trim(), password })
      router.replace('/(tabs)')
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Login failed', text2: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Logo size="md" />
          <Text style={[styles.logoText, { marginTop: Spacing.sm }]}>LifeOS</Text>
          <Text style={styles.logoSub}>Your life, organized.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
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

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={[
              styles.inputContainer,
              focusedInput === 'password' && styles.inputContainerFocused
            ]}>
              <TextInput
                style={styles.inputField}
                placeholder="••••••••"
                placeholderTextColor={colors.ink[400]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotBtn} onPress={() => router.push('/(auth)/forgot-password' as any)}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{"Don't have an account? "}</Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Create one</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.soft },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  logoText: { fontSize: FontSize.xxxl, fontWeight: '800', color: colors.ink[900] },
  logoSub: { fontSize: FontSize.sm, color: colors.ink[500], marginTop: 2 },
  card: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: colors.ink[900] },
  subtitle: { fontSize: FontSize.sm, color: colors.ink[500], marginBottom: Spacing.lg, marginTop: 4 },
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
    marginTop: -4,
  },
  forgotText: {
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { color: colors.ink[500], fontSize: FontSize.sm },
  footerLink: { color: colors.brand[600], fontWeight: '700', fontSize: FontSize.sm },
}))
