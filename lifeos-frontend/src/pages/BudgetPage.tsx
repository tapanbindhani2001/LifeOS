import { Users } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { EmptyState } from '@/components/ui/Overlay'

export default function BudgetPage() {
  return (
    <AppLayout title="Budget" subtitle="Plan and track your monthly budget.">
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="Budget is coming soon"
        description="Once /budget endpoints ship in the backend, this page will let you set category budgets, track against actuals, and visualize overspending."
      />
    </AppLayout>
  )
}
