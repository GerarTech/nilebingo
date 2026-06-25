/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Needed for Telegram Mini App
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://*.telegram.org https://telegram.org https://*.run.app https://*.google.com https://*.studio https://*.vercel.app;" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;