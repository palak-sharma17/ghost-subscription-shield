import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShieldDashboard from './ShieldDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: true })

  const { data: activity } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(14)

  return (
    <ShieldDashboard
      initialSubscriptions={subscriptions || []}
      initialActivity={activity || []}
      userEmail={user.email || ''}
    />
  )
}