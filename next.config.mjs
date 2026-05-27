/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pollinations.ai' },
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
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
