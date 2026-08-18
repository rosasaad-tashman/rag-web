// Computes CLIP image embeddings for every icon in data/catalog.json and
// writes them to data/embeddings.json. Run this once locally whenever icons
// are added or changed:
//
//   npm run build:embeddings
//
// This runs entirely in Node via @xenova/transformers (no Python, no GPU
// required) so it can run in CI or before a Vercel deploy just as easily as
// on a laptop. The same model is used for text queries at request time in
// app/api/search/route.ts, so image and text vectors land in the same space.

import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from "@xenova/transformers";
import fs from "node:fs/promises";
import path from "node:path";

const MODEL_ID = "Xenova/clip-vit-base-patch32";
const ROOT = path.resolve(import.meta.dirname, "..");
const CATALOG_PATH = path.join(ROOT, "data", "catalog.json");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const OUT_PATH = path.join(ROOT, "data", "embeddings.json");

function cosineNormalize(vec) {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  return Array.from(vec, (v) => v / norm);
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(CATALOG_PATH, "utf-8"));

  console.log(`Loading ${MODEL_ID} (first run downloads + caches the model)...`);
  const processor = await AutoProcessor.from_pretrained(MODEL_ID);
  const visionModel = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID);

  const results = [];
  for (const [i, entry] of catalog.entries()) {
    const filePath = path.join(ICONS_DIR, entry.file);
    const image = await RawImage.read(filePath);
    const inputs = await processor(image);
    const { image_embeds } = await visionModel(inputs);
    const vector = cosineNormalize(image_embeds.data);
    results.push({ id: entry.id, vector });
    console.log(`  [${i + 1}/${catalog.length}] embedded ${entry.file}`);
  }

  await fs.writeFile(OUT_PATH, JSON.stringify(results));
  console.log(`Saved ${results.length} embeddings to ${path.relative(ROOT, OUT_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
