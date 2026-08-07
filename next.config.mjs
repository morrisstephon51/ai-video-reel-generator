/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pollinations.ai' },
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  // Redirect the index route at the routing layer. A component-level
  // redirect() in app/page.tsx gets statically prerendered by Next 14.2.x
  // and served from Vercel's edge cache without a Location header, leaving
  // the bare domain on a dead-end 307. A config redirect always emits a
  // correct Location and is handled before the page ever renders.
  async redirects() {
    return [
      { source: '/', destination: '/dashboard', permanent: false },
    ]
  },
  // Allow ffmpeg binary in serverless
  experimental: {
    serverComponentsExternalPackages: ['fluent-ffmpeg', '@ffmpeg-installer/ffmpeg', 'node-gtts'],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), { 'node-gtts': 'node-gtts' }]
    return config
  },
}

export default nextConfig
