import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { searchIcons } from "@/lib/search";

export const runtime = "nodejs";
export const maxDuration = 60;

function extractSvg(text: string): string | null {
  const fenced = text.match(/```(?:svg|xml|html)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const match = candidate.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : null;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  try {
    // 1. Find the closest existing icon(s) to use as a style reference.
    const matches = await searchIcons(description, 2);
    const topMatch = matches[0];

    let referenceImageBlock: Anthropic.ImageBlockParam | null = null;
    if (topMatch) {
      const filePath = path.join(process.cwd(), "public", "icons", topMatch.file);
      const bytes = await fs.readFile(filePath);
      referenceImageBlock = {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: bytes.toString("base64"),
        },
      };
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const content: Anthropic.ContentBlockParam[] = [];
    if (referenceImageBlock) {
      content.push(referenceImageBlock);
      content.push({
        type: "text",
        text:
          `The attached image ("${topMatch.name}") is the closest existing icon in our library ` +
          `(similarity score ${topMatch.score.toFixed(2)}, out of 1.0 — treat scores below ~0.30 as ` +
          `a weak match, meaning you should still follow the palette/line style but not the subject).\n\n` +
          `Draw a new icon of: "${description}".\n\n` +
          `Match the reference's visual style as closely as makes sense (stroke width, palette, flat vs ` +
          `line-art, corner rounding), even if the subject itself has no precedent in the reference.`,
      });
    } else {
      content.push({
        type: "text",
        text:
          `Draw a new icon of: "${description}".\n\n` +
          `No existing icon in the library was a reasonable style match, so use your best judgment for a ` +
          `clean, flat, bold-outline educational icon style suitable for K-12 math materials.`,
      });
    }

    content.push({
      type: "text",
      text:
        "Respond with ONLY raw SVG markup (a single <svg>...</svg> element), no prose, no markdown fences. " +
        "Use a viewBox around 0 0 680 500 scaled to the subject, and use plain hex colors (not CSS variables).",
    });

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content }],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const svg = textBlock ? extractSvg(textBlock.text) : null;

    if (!svg) {
      return NextResponse.json({ error: "Claude did not return a usable SVG" }, { status: 502 });
    }

    return NextResponse.json({
      svg,
      styleReference: topMatch
        ? { id: topMatch.id, name: topMatch.name, score: topMatch.score, file: topMatch.file }
        : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "generation failed" }, { status: 500 });
  }
}
