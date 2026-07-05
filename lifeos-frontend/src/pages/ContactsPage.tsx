import { Users } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { EmptyState } from '@/components/ui/Overlay'

export default function ContactsPage() {
  return (
    <AppLayout title="Contacts" subtitle="Keep track of the people who matter.">
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        title="Contacts is coming soon"
        description="This module isn't in the current backend API spec yet — once /contacts endpoints ship, this page will list, add, and organize your contacts."
      />
    </AppLayout>
  )
}
