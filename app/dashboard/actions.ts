'use server'
import {createClient} from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addSubscription(data: { name: string; category: string; cost: number; lastUsed: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const lastUsedDate = new Date(Date.now() - data.lastUsed * 86400000).toISOString().split('T')[0]

  await supabase.from('subscriptions').insert({
    user_id: user.id,
    name: data.name,
    category: data.category,
    cost: data.cost,
    cap: data.cost,
    last_used_at: lastUsedDate,
    status: 'active'
  })

  await supabase.from('activity_log').insert({
    user_id: user.id,
    message: `${data.name} brought under the Shield — ₹${data.cost}/mo tracked.`,
    kind: 'info'
  })

  revalidatePath('/dashboard')
}

export async function killSwitch(subId: string, name: string, cost: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  await supabase.from('subscriptions').update({ status: 'killed' }).eq('id', subId)
  await supabase.from('activity_log').insert({
    user_id: user.id,
    message: `Mandate revoked for ${name} — saved ₹${cost}/month. No retention screen shown.`,
    kind: 'good'
  })

  revalidatePath('/dashboard')
}

export async function undoKill(subId: string, name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  await supabase.from('subscriptions').update({ status: 'active' }).eq('id', subId)
  await supabase.from('activity_log').insert({
    user_id: user.id,
    message: `Cancellation undone for ${name} — subscription restored.`,
    kind: 'info'
  })

  revalidatePath('/dashboard')
}

export async function markUsed(subId: string, name: string, wasZombie: boolean) {
 const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  await supabase.from('subscriptions').update({ last_used_at: new Date().toISOString().split('T')[0] }).eq('id', subId)
  await supabase.from('activity_log').insert({
    user_id: user.id,
    message: `${wasZombie ? 'Zombie flag cleared' : 'Zombie clock reset'} for ${name} — you told the Shield you used it today.`,
    kind: 'good'
  })

  revalidatePath('/dashboard')
}

export async function updateCap(subId: string, name: string, newCap: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  await supabase.from('subscriptions').update({ cap: newCap }).eq('id', subId)
  await supabase.from('activity_log').insert({
    user_id: user.id,
    message: `Spending cap for ${name} set to ₹${newCap}/mo.`,
    kind: 'info'
  })

  revalidatePath('/dashboard')
}

export async function simulateHike(subId: string, name: string, currentCost: number, cap: number) {
 const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const hikePct = 0.15 + Math.random() * 0.25
  const newCost = Math.round(currentCost * (1 + hikePct))

  if (newCost > cap) {
    const { data: sub } = await supabase.from('subscriptions').select('blocked_total').eq('id', subId).single()
    const newBlockedTotal = (sub?.blocked_total || 0) + (newCost - currentCost)
    await supabase.from('subscriptions').update({ blocked_total: newBlockedTotal }).eq('id', subId)
    await supabase.from('activity_log').insert({
      user_id: user.id,
      message: `${name} tried to raise its price to ₹${newCost}/mo — blocked by your ₹${cap} cap.`,
      kind: 'danger'
    })
  } else {
    await supabase.from('subscriptions').update({ cost: newCost }).eq('id', subId)
    await supabase.from('activity_log').insert({
      user_id: user.id,
      message: `${name} raised its price to ₹${newCost}/mo — within your cap, so it went through.`,
      kind: 'warn'
    })
  }

  revalidatePath('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}