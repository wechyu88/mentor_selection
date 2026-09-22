import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const githubPagesBasePath =
  process.env.GITHUB_ACTIONS === "true" && repositoryName
    ? `/${repositoryName}`
    : "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // GitHub Pages mounts the uploaded artifact under the repository path itself.
  // Setting Next's basePath here makes vinext skip prerendering `/`, leaving
  // the published artifact without an index.html. Only assets need the prefix.
  assetPrefix: githubPagesBasePath || undefined,
};

export default nextConfig;
