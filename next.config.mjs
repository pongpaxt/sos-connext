import withPWA from 'next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})({
  // เพิ่มบรรทัดนี้เพื่อป้องกัน Error เรื่อง Turbopack
  webpack: (config) => {
    return config;
  },
});

export default nextConfig;