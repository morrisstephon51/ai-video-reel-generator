import { createServiceClient } from '@/lib/supabase/server'

export interface AnalyticsData {
  postId: string
  platform: string
  platformPostId: string
  views: number
  likes: number
  shares: number
  comments: number
  reach: number
  impressions: number
  engagement_rate: number
  recorded_at: string
}

// Stub that returns mock analytics data structure.
// Real platform OAuth integration comes in Phase 5.
export async function ingestAnalytics(
  postId: string,
  platform: string,
  platformPostId: string
): Promise<AnalyticsData> {
  // Generate realistic mock data based on platform norms
  const baseViews = Math.floor(Math.random() * 5000) + 200
  const likeRate = platform === 'tiktok' ? 0.08 : platform === 'instagram' ? 0.06 : 0.04
  const shareRate = platform === 'tiktok' ? 0.02 : 0.01
  const commentRate = 0.005

  const analytics: AnalyticsData = {
    postId,
    platform,
    platformPostId,
    views: baseViews,
    likes: Math.floor(baseViews * likeRate),
    shares: Math.floor(baseViews * shareRate),
    comments: Math.floor(baseViews * commentRate),
    reach: Math.floor(baseViews * 1.2),
    impressions: Math.floor(baseViews * 1.5),
    engagement_rate: parseFloat(((likeRate + shareRate + commentRate) * 100).toFixed(2)),
    recorded_at: new Date().toISOString(),
  }

  // Save to post_analytics table
  try {
    const db = createServiceClient()
    await db.from('post_analytics').insert({
      post_id:         analytics.postId,
      platform:        analytics.platform,
      platform_post_id: analytics.platformPostId,
      views:           analytics.views,
      likes:           analytics.likes,
      shares:          analytics.shares,
      comments:        analytics.comments,
      reach:           analytics.reach,
      impressions:     analytics.impressions,
      engagement_rate: analytics.engagement_rate,
      recorded_at:     analytics.recorded_at,
    })
  } catch (err) {
    console.error('[analytics-ingester] Failed to save analytics:', (err as Error).message)
  }

  return analytics
}
