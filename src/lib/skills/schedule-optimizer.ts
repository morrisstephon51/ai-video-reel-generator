export interface PostSchedule {
  day: string
  time: string
  engagement_index: number
}

// Best-practice posting times per platform based on engagement research
const PLATFORM_SCHEDULES: Record<string, PostSchedule[]> = {
  tiktok: [
    { day: 'Tuesday',   time: '09:00', engagement_index: 92 },
    { day: 'Thursday',  time: '12:00', engagement_index: 95 },
    { day: 'Friday',    time: '18:00', engagement_index: 98 },
    { day: 'Saturday',  time: '11:00', engagement_index: 90 },
    { day: 'Sunday',    time: '19:00', engagement_index: 88 },
  ],
  instagram: [
    { day: 'Monday',    time: '11:00', engagement_index: 85 },
    { day: 'Wednesday', time: '14:00', engagement_index: 93 },
    { day: 'Thursday',  time: '11:00', engagement_index: 96 },
    { day: 'Friday',    time: '10:00', engagement_index: 91 },
    { day: 'Saturday',  time: '09:00', engagement_index: 87 },
  ],
  youtube: [
    { day: 'Thursday',  time: '14:00', engagement_index: 88 },
    { day: 'Friday',    time: '12:00', engagement_index: 94 },
    { day: 'Saturday',  time: '09:00', engagement_index: 97 },
    { day: 'Sunday',    time: '11:00', engagement_index: 95 },
  ],
  twitter: [
    { day: 'Tuesday',   time: '09:00', engagement_index: 90 },
    { day: 'Wednesday', time: '12:00', engagement_index: 94 },
    { day: 'Thursday',  time: '09:00', engagement_index: 93 },
    { day: 'Friday',    time: '12:00', engagement_index: 89 },
  ],
  linkedin: [
    { day: 'Tuesday',   time: '10:00', engagement_index: 96 },
    { day: 'Wednesday', time: '08:00', engagement_index: 95 },
    { day: 'Thursday',  time: '09:00', engagement_index: 97 },
    { day: 'Friday',    time: '10:00', engagement_index: 82 },
  ],
  facebook: [
    { day: 'Wednesday', time: '13:00', engagement_index: 91 },
    { day: 'Thursday',  time: '08:00', engagement_index: 88 },
    { day: 'Friday',    time: '13:00', engagement_index: 93 },
    { day: 'Saturday',  time: '12:00', engagement_index: 86 },
  ],
}

export function getBestPostTimes(
  platform: string,
  _timezone?: string
): PostSchedule[] {
  const normalized = platform.toLowerCase()
  return (PLATFORM_SCHEDULES[normalized] ?? PLATFORM_SCHEDULES['instagram'])
    .sort((a, b) => b.engagement_index - a.engagement_index)
}
