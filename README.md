# Content-Image-RAG — web interface

A small Next.js app that lets anyone search the icon library by meaning and
generate new icons matched to its visual style — no Python, no local model
files, deployable straight to Vercel.

## How it works

- **Search** runs CLIP entirely in JavaScript via [`@xenova/transformers`](https://github.com/xenova/transformers.js).
  Every icon's image embedding is precomputed and checked into `data/embeddings.json`;
  a search request only has to encode your text query and do a cosine-similarity
  lookup, so it's fast and needs no GPU.
- **Generate** takes your description, finds the closest existing icon the same
  way search does, sends both to Claude (with the reference icon as an image)
  and asks for a new SVG matched to that style. If nothing in the library is a
  reasonable match, Claude falls back to a clean default style instead of
  forcing a bad comparison.

## Project structure

```
app/
  page.tsx                 the UI (search box, results grid, generate panel)
  api/search/route.ts      POST { query } -> ranked icon matches
  api/generate/route.ts    POST { description } -> { svg, styleReference }
lib/search.ts              shared CLIP text-encoding + cosine similarity
data/catalog.json          icon metadata (name, category, tags, filename)
data/embeddings.json       precomputed image embeddings (generated, see below)
public/icons/              the actual icon PNGs
scripts/build-embeddings.mjs   (re)computes data/embeddings.json
```

## Local setup

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## Adding or changing icons

1. Drop the new PNG into `public/icons/`.
2. Add a matching entry to `data/catalog.json` (id, name, category, collection, file, tags).
3. Re-run the embedding build:

   ```bash
   npm run build:embeddings
   ```

   This downloads/caches the CLIP model on first run and writes fresh vectors
   to `data/embeddings.json`. Commit that file — the deployed app reads it
   directly rather than recomputing embeddings at request time.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, "Add New Project" -> import the repo. Framework preset
   (Next.js) is detected automatically.
3. Add an environment variable: `ANTHROPIC_API_KEY` = your key from
   console.anthropic.com.
4. Deploy. No other configuration is needed -- `data/embeddings.json` ships
   as part of the repo, so there's nothing to build at deploy time.

**Note on cold starts:** the first search or generate request after a period
of inactivity will be slower (the CLIP model has to load into the serverless
function). Subsequent requests on a warm instance are fast.

## Source material

`source-pdfs/` holds the four original PDFs this catalog was built from
(`Video_Slides_Resource_Bank.pdf`, `Doodle_Icons.pdf`,
`Clipart_collection_organization.pdf`, `K-2_Math_Resource_Icons.pdf`).
They're kept outside `public/` on purpose -- they're multi-MB reference
material for whoever extends the catalog, not runtime assets the deployed
app needs to serve.

## Current icon set

This ships with a starter catalog of 14 icons: 6 verified icons pulled from
the original PDFs (toy car, pointing finger, pass/not-yet-sad faces, snap
cube, group triangle) plus the 8 icons generated earlier in this project
(happy/frowning face, pointing finger, waving hand, parallelogram, 2x2x2
cube, both prisms). The full icon library has ~240 extracted images that
weren't individually verified/labeled -- add them following the steps above
as they get properly named.
