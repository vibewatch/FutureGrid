import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const githubPagesBasePath = process.env.GITHUB_PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages && githubPagesBasePath ? githubPagesBasePath : undefined,
  trailingSlash: isGitHubPages,
  env: {
    // Exposed to client code so fetch("/world-countries.geo.json") is prefixed correctly
    // when deployed to GitHub Pages under a sub-path (e.g. /FutureGrid).
    NEXT_PUBLIC_BASE_PATH:
      isGitHubPages && githubPagesBasePath ? githubPagesBasePath : "",
  },
};

export default nextConfig;