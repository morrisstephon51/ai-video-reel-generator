export interface QueueItem {
  id: string
  platform: string
  title: string
  description: string | null
  caption: string | null
  hashtags: string[]
  video_url: string | null
  thumbnail_url: string | null
}

export type PublishResult =
  | { outcome: 'posted'; postId: string }
  | { outcome: 'ready'; reason: string }
  | { outcome: 'failed'; error: string }

async function youtubeAccessToken(): Promise<string | null> {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: YOUTUBE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`YouTube token refresh failed: ${res.status}`)
  const data = await res.json()
  return data.access_token ?? null
}

async function publishToYouTube(item: QueueItem): Promise<PublishResult> {
  const token = await youtubeAccessToken()
  if (!token) return { outcome: 'ready', reason: 'YouTube OAuth env vars not set — post manually from the queue' }
  if (!item.video_url) return { outcome: 'failed', error: 'No video_url on queue item' }

  const videoRes = await fetch(item.video_url)
  if (!videoRes.ok) return { outcome: 'failed', error: `Could not fetch video: ${videoRes.status}` }
  const videoBytes = Buffer.from(await videoRes.arrayBuffer())

  const snippet = {
    snippet: {
      title: item.title.slice(0, 100),
      description: [item.description ?? '', (item.hashtags ?? []).join(' ')].filter(Boolean).join('\n\n'),
      categoryId: '22',
    },
    status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
  }

  const boundary = `boundary_${item.id.replace(/-/g, '')}`
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(snippet)}\r\n--${boundary}\r\nContent-Type: video/*\r\n\r\n`),
    videoBytes,
    Buffer.from(`\r\n--${boundary}--`),
  ])

  const upload = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!upload.ok) {
    const detail = await upload.text().catch(() => '')
    return { outcome: 'failed', error: `YouTube upload ${upload.status}: ${detail.slice(0, 300)}` }
  }
  const uploaded = await upload.json()
  return { outcome: 'posted', postId: uploaded.id ?? 'unknown' }
}

// TikTok / Instagram / etc. require app-review-gated APIs, so those queue items
// become 'ready' bundles: caption + hashtags + video + thumbnail, one tap to post manually.
export async function publishToPlatform(item: QueueItem): Promise<PublishResult> {
  try {
    if (item.platform === 'youtube') return await publishToYouTube(item)
    return { outcome: 'ready', reason: `${item.platform} has no free auto-post API — bundle is ready to post` }
  } catch (err) {
    return { outcome: 'failed', error: (err as Error).message }
  }
}
