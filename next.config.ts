import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const githubPagesBasePath = process.env.GITHUB_PAGES_BASE_PATH;

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGitHubPages && githubPagesBasePath ? githubPagesBasePath : undefined,
  trailingSlash: isGitHubPages,
};

export default nextConfig;