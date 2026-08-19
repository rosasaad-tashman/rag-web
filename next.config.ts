import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @xenova/transformers pulls in onnxruntime-node, which ships a native
  // .so binary. If Next.js bundles it like normal JS, that binary gets
  // left out of the serverless function and crashes at runtime with
  // "libonnxruntime.so: cannot open shared object file". Marking it as
  // an external package makes Next.js require() it from node_modules
  // instead of bundling it.
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],

  // serverExternalPackages alone stops Next.js from bundling it, but
  // Vercel's separate file-tracing step (which decides which files
  // actually get copied into the deployed function) can still miss
  // non-JS binary files like this one. This explicitly forces the
  // native .so/.node binaries into the trace for both routes that use
  // the search library, so the file is actually present at runtime.
  outputFileTracingIncludes: {
    "/api/search": ["./node_modules/onnxruntime-node/bin/**/*"],
    "/api/generate": ["./node_modules/onnxruntime-node/bin/**/*"],
  },
};

export default nextConfig;
