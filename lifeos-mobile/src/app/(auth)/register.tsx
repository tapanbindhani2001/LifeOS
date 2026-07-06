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
import { authApi } from '../../api/auth'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../../constants/theme'
import Toast from 'react-native-toast-message'

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Toast.show({ type: 'error', text1: 'Please fill in all fields' })
      return
    }
    if (password.length < 8) {
      Toast.show({ type: 'error', text1: 'Password must be at least 8 characters' })
      return
    }
    setLoading(true)
    try {
      await authApi.register({ fullName, email, password })
      Toast.show({ type: 'success', text1: 'Account created!', text2: 'Please sign in.' })
      router.replace('/(auth)/login')
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Registration failed', text2: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>LifeOS</Text>
          <Text style={styles.logoSub}>Your life, organized.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start organizing your life today</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Tapan Bindhani"
              placeholderTextColor={Colors.ink[300]}
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.ink[300]}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={Colors.ink[300]}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface.soft },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  logoWrap: { alignItems: 'center', marginBottom: Spacing.xl },
  logoDot: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.brand[500],
    marginBottom: Spacing.sm,
  },
  logoText: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.ink[900] },
  logoSub: { fontSize: FontSize.sm, color: Colors.ink[500], marginTop: 2 },
  card: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.ink[900] },
  subtitle: { fontSize: FontSize.sm, color: Colors.ink[500], marginBottom: Spacing.lg, marginTop: 4 },
  field: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink[700], marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.ink[200],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.ink[900],
    backgroundColor: Colors.surface.soft,
  },
  btn: {
    backgroundColor: Colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { color: Colors.ink[500], fontSize: FontSize.sm },
  footerLink: { color: Colors.brand[600], fontWeight: '700', fontSize: FontSize.sm },
})
