/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
 images: {
  remotePatterns: [
     {
      protocol: 'https',
       hostname: 'images.unsplash.com',
       port: '',
       pathname: '/**',
     },
   ],
  },
  experimental: {
   serverActions: {
     bodySizeLimit: '2mb',
   },
  },
};

export default nextConfig;
