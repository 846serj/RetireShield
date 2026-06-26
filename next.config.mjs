/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/ask", destination: "/coach", permanent: false },
      { source: "/dashboard", destination: "/coach", permanent: false },
      { source: "/dashboard/coach", destination: "/coach", permanent: false },
      { source: "/dashboard/score", destination: "/score", permanent: false },
      { source: "/dashboard/monitoring", destination: "/alerts", permanent: false },
      { source: "/dashboard/accounts", destination: "/accounts", permanent: false },
      { source: "/dashboard/settings", destination: "/settings", permanent: false },
      { source: "/dashboard/tools/:path*", destination: "/tools/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
