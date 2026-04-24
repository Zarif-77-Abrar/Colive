const nextConfig = {
  async headers() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "no-cache",
          },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:9209/api",
  },
};

export default nextConfig;
