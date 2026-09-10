const buffer = require('buffer');
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = buffer.Buffer;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'sharp'],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    if (isServer) {
      config.externals = [...(config.externals || []), '@xenova/transformers', 'onnxruntime-node', 'sharp'];
    }
    return config;
  },
};

module.exports = nextConfig;
