import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin({
  experimental: {
    // Relative path(s) to source files
    srcPath: "./src",

    extract: {
      // Defines which locale to extract to
      sourceLocale: "de",
    },

    messages: {
      // Relative path to the directory
      path: "./messages",

      // Either 'json', 'po', or a custom format (see below)
      format: "po",

      // Either 'infer' to automatically detect locales based on
      // matching files in `path` or an explicit array of locales
      locales: "infer",
    },
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
};

export default withNextIntl(nextConfig);
