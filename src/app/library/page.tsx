import Sidebar from '@/components/Sidebar'
import VideoCard from '@/components/VideoCard'
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const db = createServiceClient()

  const { data: videos } = await db
    .from('videos')
    .select(`
      id, topic, status, created_at,
      exports ( mp4_url, thumbnail_url ),
      master_decisions ( composite_score )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Library</h1>
              <p className="text-zinc-500 text-sm mt-1">{videos?.length ?? 0} videos generated</p>
            </div>
            <Link
              href="/generate"
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Sparkles size={14} />
              New Video
            </Link>
          </div>

          {videos?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {videos.map(v => {
                const exports = v.exports as Array<{ mp4_url: string; thumbnail_url: string }> | null
                const decisions = v.master_decisions as Array<{ composite_score: number }> | null
                return (
                  <VideoCard
                    key={v.id}
                    id={v.id}
                    topic={v.topic}
                    status={v.status}
                    createdAt={v.created_at}
                    thumbnailUrl={exports?.[0]?.thumbnail_url}
                    compositeScore={decisions?.[0]?.composite_score}
                  />
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-zinc-600">
              <Sparkles size={40} className="mb-4 opacity-20" />
              <p className="text-sm">Your library is empty. Generate your first video.</p>
              <Link href="/generate" className="mt-4 text-sm text-brand-400 hover:text-brand-300">
                Generate now →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
