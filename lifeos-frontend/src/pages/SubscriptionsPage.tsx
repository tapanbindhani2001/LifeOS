import { useState } from 'react'
import { Check, Crown, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { AppLayout } from '@/components/layout/AppLayout'
import { ConfirmDialog } from '@/components/ui/Overlay'
import { useSubscription } from '@/hooks/useSubscription'
import { subscriptionsApi } from '@/api/platform'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { SubscriptionPlan } from '@/types'

const PLANS: { plan: SubscriptionPlan; name: string; price: string; features: string[] }[] = [
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

export default function SubscriptionsPage() {
  const { data: subscription, isLoading } = useSubscription()
  const qc = useQueryClient()
  const [upgrading, setUpgrading] = useState<SubscriptionPlan | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setUpgrading(plan)
    try {
      await subscriptionsApi.upgrade({
        plan,
        status: 'ACTIVE',
        price: plan === 'MONTHLY' ? 299 : plan === 'ANNUAL' ? 2499 : 0,
        billingCycle: plan === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
        startDate: new Date().toISOString(),
      })
      qc.invalidateQueries({ queryKey: ['subscription'] })
      toast.success(`Switched to ${plan.charAt(0) + plan.slice(1).toLowerCase()} plan`)
    } catch {
      toast.error('Could not update your plan')
    } finally {
      setUpgrading(null)
    }
  }

  const handleCancel = async () => {
    try {
      await subscriptionsApi.cancel()
      qc.invalidateQueries({ queryKey: ['subscription'] })
      toast.success('Your plan will not renew at period end')
    } catch {
      toast.error('Could not cancel renewal')
    }
  }

  return (
    <AppLayout title="Subscriptions" subtitle="Manage your LifeOS plan and billing.">
      {/* Current plan banner */}
      {!isLoading && subscription && (
        <div className="card mb-6 flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-medium text-ink-500">Current plan</p>
            <p className="font-display text-lg font-bold text-ink-900">
              {subscription.plan.charAt(0) + subscription.plan.slice(1).toLowerCase()}
            </p>
            {/* endDate is the period-end field on the Subscription type */}
            {subscription.endDate && (
              <p className="text-xs text-ink-500">
                {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'} on{' '}
                {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            )}
          </div>
          {subscription.plan !== 'FREE' && !subscription.cancelAtPeriodEnd && (
            <button onClick={() => setCancelOpen(true)} className="btn-secondary">
              Cancel renewal
            </button>
          )}
          {subscription.cancelAtPeriodEnd && (
            <span className="badge bg-amber-50 text-amber-600">Cancels at period end</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const active = subscription?.plan === p.plan
          return (
            <div
              key={p.plan}
              className={clsx(
                'card relative flex flex-col p-6',
                p.plan === 'ANNUAL' && 'border-2 border-brand-400',
              )}
            >
              {p.plan === 'ANNUAL' && (
                <span className="badge absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white">
                  Best value
                </span>
              )}
              <div className="mb-3 flex items-center gap-2">
                {p.plan !== 'FREE' && <Crown className="h-4 w-4 text-amber-500" />}
                <h3 className="font-display text-lg font-bold text-ink-900">{p.name}</h3>
              </div>
              <p className="font-display text-2xl font-bold text-ink-900">{p.price}</p>
              <ul className="my-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={active || upgrading === p.plan}
                onClick={() => handleUpgrade(p.plan)}
                className={active ? 'btn-secondary w-full' : 'btn-primary w-full'}
              >
                {upgrading === p.plan && <Loader2 className="h-4 w-4 animate-spin" />}
                {active ? 'Current plan' : `Switch to ${p.name}`}
              </button>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel renewal"
        description="Your plan will remain active until the end of the current billing period, then move to Free."
        confirmLabel="Confirm cancellation"
        onConfirm={handleCancel}
      />
    </AppLayout>
  )
}
