export interface Trend {
  title: string
  traffic: string
  rank: number
}

export async function fetchTrends(geo = 'US'): Promise<Trend[]> {
  const url = `https://trends.google.com/trends/trendingsearches/daily/rss?geo=${geo}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendFetcher/1.0)' },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch trends: ${res.status} ${res.statusText}`)
  }

  const xml = await res.text()
  const trends: Trend[] = []

  // Parse <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let itemMatch: RegExpExecArray | null
  let rank = 1

  while ((itemMatch = itemRegex.exec(xml)) !== null && trends.length < 20) {
    const itemXml = itemMatch[1]

    // Extract title — handles both CDATA and plain
    let title = ''
    const cdataTitle = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>/.exec(itemXml)
    const plainTitle = /<title>([^<]+)<\/title>/.exec(itemXml)
    if (cdataTitle) {
      title = cdataTitle[1].trim()
    } else if (plainTitle) {
      title = plainTitle[1].trim()
    }

    // Extract approxTraffic
    let traffic = 'unknown'
    const trafficMatch = /<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/.exec(itemXml)
    if (trafficMatch) {
      traffic = trafficMatch[1].trim()
    }

    if (title) {
      trends.push({ title, traffic, rank: rank++ })
    }
  }

  return trends
}
