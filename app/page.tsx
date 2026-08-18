"use client";

import { useState } from "react";

type SearchResult = {
  id: string;
  name: string;
  category: string;
  collection: string;
  file: string;
  tags: string[];
  score: number;
};

type GenerateResult = {
  svg: string;
  styleReference: { id: string; name: string; score: number; file: string } | null;
};

function ScoreMeter({ score }: { score: number }) {
  // Cosine similarities for this model cluster roughly 0.15-0.40; stretch
  // that range to a 0-100% bar so differences are visible at a glance.
  const pct = Math.max(0, Math.min(100, ((score - 0.15) / 0.25) * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-[#E4E1D8] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0C447C]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-[#6B685F]">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [generated, setGenerated] = useState<GenerateResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function runGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setGenerating(true);
    setGenerateError(null);
    setGenerated(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGenerated(data);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function downloadSvg() {
    if (!generated) return;
    const blob = new Blob([generated.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${description.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "icon"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-16">
      <header className="mb-14">
        <p className="font-mono text-xs tracking-widest uppercase text-[#0F6E56] mb-3">
          Content-Image-RAG
        </p>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl leading-tight text-[#0C447C]">
          Find an icon by what<br />it means. Generate one<br />by what it looks like.
        </h1>
        <p className="font-body text-lg text-[#4A473F] mt-5 max-w-xl">
          This searches the icon library by real visual meaning (CLIP embeddings, not
          keyword tags), and can draw a brand-new icon matched to whatever it finds closest.
        </p>
      </header>

      {/* Search */}
      <section className="mb-16">
        <h2 className="font-display font-bold text-xl mb-4">
          Search the library
        </h2>
        <form onSubmit={runSearch} className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. a red toy car, a sad face, a triangular shape"
            className="flex-1 rounded-lg border border-[#D8D4C7] bg-white px-4 py-3 font-body text-base focus:outline-none focus:ring-2 focus:ring-[#0C447C]"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-[#0C447C] px-6 py-3 font-display font-bold text-sm text-white disabled:opacity-50"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {searchError && (
          <p className="mt-4 text-sm text-[#B3261E]">{searchError}</p>
        )}

        {results && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {results.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-[#E4E1D8] bg-white p-4 flex flex-col items-center text-center"
              >
                <img
                  src={`/icons/${r.file}`}
                  alt={r.name}
                  className="h-20 w-20 object-contain mb-3"
                />
                <p className="font-display font-semibold text-sm mb-1">
                  {r.name}
                </p>
                <p className="text-xs text-[#8A8677] mb-2">{r.collection}</p>
                <ScoreMeter score={r.score} />
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-[#E4E1D8] mb-16" />

      {/* Generate */}
      <section>
        <h2 className="font-display font-bold text-xl mb-2">
          Generate a new icon
        </h2>
        <p className="text-sm text-[#6B685F] mb-4">
          Describe what you need. It's matched against the library first, and drawn to fit
          that style — even when nothing similar exists yet.
        </p>
        <form onSubmit={runGenerate} className="flex gap-3">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. a waving hand, palm out, five fingers"
            className="flex-1 rounded-lg border border-[#D8D4C7] bg-white px-4 py-3 font-body text-base focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
          />
          <button
            type="submit"
            disabled={generating}
            className="rounded-lg bg-[#0F6E56] px-6 py-3 font-display font-bold text-sm text-white disabled:opacity-50"
          >
            {generating ? "Drawing…" : "Generate"}
          </button>
        </form>

        {generateError && (
          <p className="mt-4 text-sm text-[#B3261E]">{generateError}</p>
        )}

        {generated && (
          <div className="mt-8 rounded-xl border border-[#E4E1D8] bg-white p-6">
            <div className="flex flex-col sm:flex-row gap-8">
              <div
                className="w-48 h-48 shrink-0 flex items-center justify-center rounded-lg bg-[#FAFAF6] border border-[#EFEDE4]"
                dangerouslySetInnerHTML={{ __html: generated.svg }}
              />
              <div className="flex-1">
                {generated.styleReference ? (
                  <>
                    <p className="text-xs uppercase tracking-widest text-[#8A8677] mb-1">
                      Styled after
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={`/icons/${generated.styleReference.file}`}
                        alt={generated.styleReference.name}
                        className="h-10 w-10 object-contain"
                      />
                      <div>
                        <p className="font-display font-semibold text-sm">
                          {generated.styleReference.name}
                        </p>
                        <ScoreMeter score={generated.styleReference.score} />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#8A8677] mb-4">
                    No close match existed in the library — drawn in the default style.
                  </p>
                )}
                <button
                  onClick={downloadSvg}
                  className="rounded-lg border border-[#0C447C] px-5 py-2.5 font-display font-semibold text-sm text-[#0C447C]"
                >
                  Download SVG
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer className="mt-20 pt-8 border-t border-[#E4E1D8] text-xs text-[#8A8677]">
        Icon search runs entirely in JavaScript (CLIP via transformers.js) — nothing leaves
        this server except the generation request to Claude.
      </footer>
    </main>
  );
}
