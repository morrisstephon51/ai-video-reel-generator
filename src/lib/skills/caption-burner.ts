// Generates an FFmpeg drawtext filter string for burning captions into video

export function buildCaptionFilter(
  captions: string[],
  durations: number[]
): string {
  if (!captions.length || !durations.length) return ''

  const filters: string[] = []
  let currentTime = 0

  captions.forEach((caption, index) => {
    const duration = durations[index] ?? 3
    const startTime = currentTime
    const endTime = currentTime + duration

    // Escape special FFmpeg characters
    const escaped = caption
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/:/g, '\\:')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/,/g, '\\,')

    filters.push(
      `drawtext=` +
      `text='${escaped}':` +
      `fontsize=36:` +
      `fontcolor=white:` +
      `borderw=2:` +
      `bordercolor=black:` +
      `x=(w-text_w)/2:` +
      `y=h-th-60:` +
      `enable='between(t,${startTime.toFixed(3)},${endTime.toFixed(3)})'`
    )

    currentTime = endTime
  })

  return filters.join(',')
}
