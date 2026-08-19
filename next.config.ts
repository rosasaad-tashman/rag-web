import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @xenova/transformers pulls in onnxruntime-node, which ships a native
  // .so binary. If Next.js bundles it like normal JS, that binary gets
  // left out of the serverless function and crashes at runtime with
  // "libonnxruntime.so: cannot open shared object file". Marking it as
  // an external package makes Next.js require() it from node_modules
  // instead, so Vercel's file tracer picks up the native binary correctly.
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
};

export default nextConfig;
