/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    // `pg` (PostgreSQL Supabase) di-require runtime — jangan dibundel webpack
    serverComponentsExternalPackages: ['pg'],
  },
};

export default nextConfig;
