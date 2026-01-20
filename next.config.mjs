import withPWA from 'next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})({
  // ถ้ามี config เดิมอยู่ให้ใส่ตรงนี้
});

export default nextConfig;