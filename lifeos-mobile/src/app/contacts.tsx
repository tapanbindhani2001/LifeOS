import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Spacing, FontSize } from '../constants/theme'
import { makeStyles } from '../context/ThemeContext'
import { router } from 'expo-router'

export default function ContactsScreen() {
  const styles = useStyles()
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Contacts</Text>
        </View>
      </View>

      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>👥</Text>
        <Text style={styles.emptyTitle}>Coming Soon</Text>
        <Text style={styles.emptyDesc}>
          {"The Contacts module isn't in the current backend API yet.\nOnce /contacts endpoints are live, this screen will let you list, add, and organize your contacts."}
        </Text>
      </View>
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 80,
  },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[900], marginBottom: Spacing.sm },
  emptyDesc: {
    fontSize: FontSize.sm,
    color: colors.ink[500],
    textAlign: 'center',
    lineHeight: 22,
  },
}))
