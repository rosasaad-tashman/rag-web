import { AutoTokenizer, CLIPTextModelWithProjection } from "@xenova/transformers";
import catalog from "@/data/catalog.json";
import embeddings from "@/data/embeddings.json";

const MODEL_ID = "Xenova/clip-vit-base-patch32";

export type CatalogEntry = {
  id: string;
  name: string;
  category: string;
  collection: string;
  file: string;
  tags: string[];
};

export type SearchResult = CatalogEntry & { score: number };

function normalize(vec: Float32Array | number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => v / norm);
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// The tokenizer + text model are loaded lazily and cached across warm
// serverless invocations. Cold starts pay the model-load cost once.
let tokenizerPromise: ReturnType<typeof AutoTokenizer.from_pretrained> | null = null;
let textModelPromise: ReturnType<typeof CLIPTextModelWithProjection.from_pretrained> | null = null;

async function getModel() {
  if (!tokenizerPromise) tokenizerPromise = AutoTokenizer.from_pretrained(MODEL_ID);
  if (!textModelPromise) textModelPromise = CLIPTextModelWithProjection.from_pretrained(MODEL_ID);
  return { tokenizer: await tokenizerPromise, textModel: await textModelPromise };
}

const catalogById: Record<string, CatalogEntry> = Object.fromEntries(
  (catalog as CatalogEntry[]).map((c) => [c.id, c])
);

const embeddingList = embeddings as { id: string; vector: number[] }[];

export async function searchIcons(query: string, topK = 6): Promise<SearchResult[]> {
  const { tokenizer, textModel } = await getModel();

  const inputs = tokenizer([query], { padding: true, truncation: true });
  const { text_embeds } = await textModel(inputs);
  const queryVec = normalize(text_embeds.data as Float32Array);

  const scored = embeddingList.map((e) => ({
    ...catalogById[e.id],
    score: cosineSim(queryVec, e.vector),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
