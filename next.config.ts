import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone", // self-contained server for the Docker image
  poweredByHeader: false,
  // The tool used to live at /search; keep old links working.
  async redirects() {
    return [{ source: "/search", destination: "/", permanent: true }];
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
      ],
    }];
  },
};

export default config;
