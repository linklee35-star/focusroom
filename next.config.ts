import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // jsmediatags 的 Node 版入口 require 了 react-native-fs，
      // 浏览器/SSR 环境用不到，映射为空模块避免打包报错
      "react-native-fs": "./src/lib/react-native-fs-stub.js",
    },
  },
};

export default nextConfig;
