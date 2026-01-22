import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // บรรทัดนี้สำคัญที่สุด: บอก Next.js ว่าถ้าจะใช้ Turbopack ให้ใช้แบบไม่มีเงื่อนไขพิเศษ
  experimental: {
    turbopack: {},
  },
  // บรรทัดนี้ช่วยให้ Library เก่าๆ ทำงานกับ Webpack ได้
  webpack: (config) => {
    return config;
  },
};

// ฟังก์ชันห่อหุ้ม PWA
const pwaEnabledConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // ปิดตอน dev แน่นอน
})(nextConfig);

export default pwaEnabledConfig;