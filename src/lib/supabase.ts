import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(supabaseUrl, supabaseKey)
export type Name = {
  id: number; name: string; gender: 'f' | 'm' | 'u'
  origin: string; meaning: string; style_tags: string[]
  popularity: number; syllables: number; language: string
}
