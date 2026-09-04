import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The shared design package ships TSX and CSS as source; Next must compile it.
  transpilePackages: ['@sievan/design'],
  // Static export: no auth, no writes, ~210 pages of archival content. Deploys
  // anywhere and outlives any hosting account, which is the point for an archive.
  output: 'export',
  // Emits /path/index.html so the export works on plain file hosts.
  trailingSlash: true,
  // next/image optimisation needs a server; static export cannot use it.
  images: { unoptimized: true },
};

export default nextConfig;
