/** @type {import('next').NextConfig} */
const nextConfig = {
  // Toàn bộ data là JSON tĩnh đọc lúc build -> export ra HTML tĩnh,
  // deploy được lên GitHub Pages / Netlify / Vercel mà không cần server.
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
