const buffer = require('buffer');
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = buffer.Buffer;
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
}
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.JWT_SECRET || 'writ-ai-build-secret-key-fallback';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    '@xenova/transformers',
    'onnxruntime-node',
    'sharp',
    'jsonwebtoken',
    'jwa',
    'jws',
    'buffer-equal-constant-time'
  ],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        '@xenova/transformers',
        'onnxruntime-node',
        'sharp',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
