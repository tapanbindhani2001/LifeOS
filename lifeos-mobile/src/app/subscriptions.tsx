import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import { router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsApi } from '../api/features'
import Toast from 'react-native-toast-message'

type Plan = 'FREE' | 'MONTHLY' | 'ANNUAL'

const PLANS: { plan: Plan; name: string; price: string; features: string[] }[] = [
  { plan: 'FREE', name: 'Free', price: '₹0', features: ['5 GB storage', 'Core modules', 'Community support'] },
  {
    plan: 'MONTHLY',
    name: 'Monthly',
    price: '₹299/mo',
    features: ['Unlimited storage', 'AI Assistant', 'Advanced analytics', 'Priority support'],
  },
  {
    plan: 'ANNUAL',
    name: 'Annual',
    price: '₹2,499/yr',
    features: ['Everything in Monthly', '2 months free', 'Early access to new features'],
  },
]

export default function SubscriptionsScreen() {
  const qc = useQueryClient()
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionsApi.me,
  })

  const upgradeMutation = useMutation({
    mutationFn: (plan: Plan) =>
      subscriptionsApi.upgrade({
        plan,
        status: 'ACTIVE',
        price: plan === 'MONTHLY' ? 299 : plan === 'ANNUAL' ? 2499 : 0,
        billingCycle: plan === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
        startDate: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription'] })
      Toast.show({ type: 'success', text1: 'Plan updated successfully' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Could not update your plan' }),
  })

  const cancelMutation = useMutation({
    mutationFn: subscriptionsApi.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription'] })
      Toast.show({ type: 'success', text1: 'Subscription will not renew at period end' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Could not cancel subscription' }),
  })

  const handleUpgrade = (plan: Plan) => {
    const sub = subscription as any
    if (sub?.plan === plan) return
    upgradeMutation.mutate(plan)
  }

  const handleCancel = () => {
    Alert.alert(
      'Cancel Subscription',
      'Your plan will not renew at the end of the billing period. Are you sure?',
      [
        { text: 'Keep Plan', style: 'cancel' },
        { text: 'Cancel Renewal', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ]
    )
  }

  const sub = subscription as any
  const currentPlan: Plan = sub?.plan ?? 'FREE'

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Subscriptions</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brand[500]} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current plan banner */}
          <View style={styles.currentBanner}>
            <Text style={styles.bannerLabel}>Your current plan</Text>
            <Text style={styles.bannerPlan}>{currentPlan}</Text>
            {sub?.status && (
              <Text style={styles.bannerStatus}>Status: {sub.status}</Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Choose a Plan</Text>

          {PLANS.map((item) => {
            const isActive = currentPlan === item.plan
            return (
              <View key={item.plan} style={[styles.planCard, isActive && styles.planCardActive]}>
                <View style={styles.planTop}>
                  <View>
                    <Text style={[styles.planName, isActive && styles.planNameActive]}>{item.name}</Text>
                    <Text style={[styles.planPrice, isActive && styles.planPriceActive]}>{item.price}</Text>
                  </View>
                  {isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active ✓</Text>
                    </View>
                  )}
                </View>
                <View style={styles.features}>
                  {item.features.map((f) => (
                    <Text key={f} style={[styles.featureItem, isActive && styles.featureItemActive]}>✓ {f}</Text>
                  ))}
                </View>
                {!isActive && (
                  <TouchableOpacity
                    style={styles.selectBtn}
                    onPress={() => handleUpgrade(item.plan)}
                    disabled={upgradeMutation.isPending}
                  >
                    {upgradeMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.selectBtnText}>Switch to {item.name}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )
          })}

          {currentPlan !== 'FREE' && !sub?.cancelAtPeriodEnd && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelMutation.isPending}>
              <Text style={styles.cancelBtnText}>Cancel Renewal</Text>
            </TouchableOpacity>
          )}

          {sub?.cancelAtPeriodEnd && (
            <Text style={styles.cancelNote}>
              ⚠️ Your plan will not renew at the end of the billing period.
            </Text>
          )}
        </ScrollView>
      )}
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
  content: { padding: Spacing.lg, paddingBottom: 40 },
  currentBanner: {
    backgroundColor: Colors.brand[500],
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
  bannerLabel: { color: Colors.brand[100], fontSize: FontSize.xs, fontWeight: '600' },
  bannerPlan: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  bannerStatus: { color: Colors.brand[50], fontSize: FontSize.xs, marginTop: 2 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.ink[900], marginBottom: Spacing.md },
  planCard: {
    backgroundColor: Colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardActive: {
    borderColor: Colors.brand[500],
    backgroundColor: Colors.brand[50],
  },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  planName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink[900] },
  planNameActive: { color: Colors.brand[700] },
  planPrice: { fontSize: FontSize.md, fontWeight: '700', color: Colors.ink[500], marginTop: 2 },
  planPriceActive: { color: Colors.brand[600] },
  activeBadge: { backgroundColor: Colors.brand[500], borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  features: { marginBottom: Spacing.md },
  featureItem: { fontSize: FontSize.sm, color: Colors.ink[500], paddingVertical: 3 },
  featureItemActive: { color: Colors.brand[700] },
  selectBtn: {
    backgroundColor: Colors.brand[500],
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  selectBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: Colors.status.error,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  cancelBtnText: { color: Colors.status.error, fontWeight: '700', fontSize: FontSize.sm },
  cancelNote: { fontSize: FontSize.sm, color: Colors.status.warning, textAlign: 'center', marginTop: Spacing.md, fontWeight: '600' },
})
