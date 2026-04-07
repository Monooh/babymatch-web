import { supabase } from '@/lib/supabase'
import { nameToSlug } from '@/lib/slug'
export default async function sitemap() {
  const { data } = await supabase.from('names').select('name')
  const base = 'https://babymatch.app'
  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: base+'/nombres', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: base+'/app', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    ...(data||[]).map((n:any) => ({ url: base+'/nombres/'+nameToSlug(n.name), lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 })),
  ]
}
