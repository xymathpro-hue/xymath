// src/lib/is-admin.ts

import { User } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['xymathpro@gmail.com']

export function isAdmin(user: User | null): boolean {
  if (!user?.email) return false
  return ADMIN_EMAILS.includes(user.email)
}
