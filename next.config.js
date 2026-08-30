const buffer = require('buffer');
if (!buffer.SlowBuffer) {
  buffer.SlowBuffer = buffer.Buffer;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
};

module.exports = nextConfig;
