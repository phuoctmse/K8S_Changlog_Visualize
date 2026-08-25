import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo root also has a package-lock.json (for the pipeline scripts), which
  // makes Next.js misdetect the workspace root — pin it to this app.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
