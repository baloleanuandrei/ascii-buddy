/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@asciibuddy/core",
    "@asciibuddy/pack-minimal-mono",
    "@asciibuddy/pack-retro-terminal",
    "@asciibuddy/pack-candy",
    "@asciibuddy/pack-nord",
    "@asciibuddy/pack-solarized",
    "@asciibuddy/pack-cyberpunk",
    "@asciibuddy/pack-corporate",
  ],
};

export default nextConfig;
