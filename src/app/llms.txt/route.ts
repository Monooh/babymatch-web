import { LOCALES, LOCALE_NAMES, SITE_NAME, SITE_URL, paths } from '@/i18n/config'
import { getDict } from '@/i18n/dict'
import { nameCount } from '@/lib/names'
import { monthCount } from '@/lib/saints'
import { allLists, listByKey } from '@/lib/lists'
import { t } from '@/lib/t'

export const dynamic = 'force-static'

// A plain-text map of the site for AI assistants (llmstxt.org). It repeats what the pages say; it is not a
// ranking signal on its own, just the shortest route to the right page in the right language.
export function GET() {
  const total = nameCount()
  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_NAME} is a free website for choosing a baby name as a couple. Each partner swipes through names on their own phone, liking or skipping them, and the names both chose become matches. It has ${total} girl, boy and unisex names with meaning and origin, ${allLists('en').length} themed lists, and runs in the browser in ${LOCALES.length} languages with no account and nothing to install.`,
    '',
    '- Price: free. No sign-up. No app-store download.',
    '- Partners join by opening one invitation link; from then on matches appear on both phones as either of them swipes. A like and a superlike are the two positive answers.',
    '- A final round narrows the shared names down to one: head-to-head duels, the five finalists shown and read aloud next to the family surname, and a vote that family and friends answer from a link without installing anything.',
    '- Lists are saved without an account: in the browser and in a server copy tied to a random identifier, so they are not lost when changing phones.',
    '- Every name has its own page per language: meaning, origin, gender, popularity level, similar names, sibling and middle names that go with it, its name day and well-known people who bear it.',
    '- Name pages carry official figures where the statistics office publishes them: how many people bear the name in Spain, their mean age, decade of birth and provinces (INE); births per year in the United States since 1880 (SSA), in France since 1900 (INSEE) and in Italy since 1999 (ISTAT).',
    '- A name-day calendar (santoral) has a page for every month and every day of the year, with the saints of the day and the names that celebrate it.',
    '- Meanings follow the most widely accepted etymology.',
    '- Popularity lists use each country’s latest published ranking of newborn names (INE, SSA, INSEE, GfdS, ISTAT, IRN).',
    '- Well-known people shown on name pages and on lists such as “names of YouTubers” come from Wikidata.',
  ]
  for (const l of LOCALES) {
    const d = getDict(l)
    const url = (p: string) => SITE_URL + p
    lines.push('', `## ${LOCALE_NAMES[l]}`, '',
      `- [${d.meta.homeTitle}](${url(paths.home(l))}): ${t(d.home.lead, { count: total })}`,
      `- [${d.meta.appTitle}](${url(paths.app(l))}): ${d.meta.appDesc}`,
      `- [${d.meta.namesTitle}](${url(paths.names(l))}): ${t(d.meta.namesDesc, { count: total })}`,
      `- [${d.meta.listsTitle}](${url(paths.lists(l))}): ${t(d.meta.listsDesc, { count: allLists(l).length })}`,
      `- [${d.saints.title}](${url(paths.saints(l))}): ${t(d.saints.desc, { count: Array.from({ length: 12 }, (_, m) => monthCount(l, m + 1)).reduce((a, b) => a + b, 0) })}`)
    for (const key of ['y:now:f', 'y:now:m', 'y:next', 'fame:influencer', 'fame:youtuber', 'fame:singer', 'pop:top:f', 'pop:top:m', 'g:u', 'len:short', 'pop:rare', 't:biblical', 't:nature', 't:mythology']) {
      const x = listByKey(l, key)
      if (x) lines.push(`- [${x.title}](${url(paths.list(l, x.slug))}): ${x.count}`)
    }
  }
  return new Response(lines.join('\n') + '\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
