/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // swcMinify: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Exclude problematic packages from webpack bundling
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'webdriverio',
        'appium',
        'appium-uiautomator2-driver',
        '@wdio/config',
        '@wdio/utils',
        'devtools',
        'tsconfig-paths',
        // Additional problematic packages
        'querySelectorShadowDom',
        'fs',
        'path',
      ];

      // Add fallbacks for Node.js native modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  // Ensure API routes can access Node.js modules
  serverExternalPackages: [
    'webdriverio',
    'appium',
    'appium-uiautomator2-driver',
    '@wdio/config',
    '@wdio/utils',
    'devtools',
  ],
};

module.exports = nextConfig;
