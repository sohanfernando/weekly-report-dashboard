import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  /**
   * Proxy the API through Next so the browser only ever talks to one origin.
   *
   * That keeps the session cookie first-party, which means SameSite=Lax
   * actually protects it, and there is no CORS preflight on ordinary requests.
   * The backend still has CORS configured for anyone calling it directly.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
