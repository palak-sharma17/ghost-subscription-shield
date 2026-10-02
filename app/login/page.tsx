'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
       const { error } = isSignUp
     ? await supabase.auth.signUp({ email, password })
     : await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-20 space-y-4">
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border p-2 rounded"/>
      <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full border p-2 rounded"/>
      <button className="w-full bg-black text-white p-2 rounded">{isSignUp ? 'Sign up' : 'Log in'}</button>
      <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm underline">
        {isSignUp ? 'Have an account? Log in' : 'New? Sign up'}
      </button>
    </form>
  )
}