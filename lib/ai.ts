import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { visibleFolderIds, visibleProjects } from "./access";

export const aiEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

type Source = { n: number; id: string; title: string; kind: string; folder: string; project: string };

/**
 * Answer a question using ONLY items the viewer is allowed to see.
 * Restricted folders are filtered out before anything is sent to the model.
 */
export async function askProject(v: { userId: string; workspaceId: string }, question: string, projectId?: string) {
  const projects = (await visibleProjects(v)).filter((p) => !projectId || p.id === projectId);
  const folderIds: string[] = [];
  for (const p of projects) folderIds.push(...(await visibleFolderIds(v, p.id)));
  const items = await db.item.findMany({
    where: { folderId: { in: folderIds } },
    include: { folder: { include: { project: true } } },
    orderBy: { updatedAt: "desc" },
    take: 120,
  });

  const sources: Source[] = items.map((it, i) => ({ n: i + 1, id: it.id, title: it.title, kind: it.type, folder: it.folder.name, project: it.folder.project.name }));
  const context = items
    .map((it, i) => {
      const head = `[${i + 1}] ${it.title} — ${it.type.toLowerCase()} in ${it.folder.project.name} / ${it.folder.name}`;
      const body = it.type === "NOTE" ? (it.content ?? "").slice(0, 4000) : it.type === "LINK" ? `${it.url}${it.content ? `\n${it.content}` : ""}` : `File: ${it.mimeType ?? "unknown type"}`;
      return `${head}\n${body}`;
    })
    .join("\n\n---\n\n");

  if (!items.length) return { answer: "There's nothing in the folders you can see yet, so there's nothing to answer from.", sources: [] as Source[] };

  const client = new Anthropic();
  const res = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system:
      "You are SOT's project assistant. Answer the user's question using only the numbered project items provided. " +
      "Cite items inline like [3]. If the items don't contain the answer, say so plainly and suggest where it might be documented. Keep answers short and concrete.",
    messages: [{ role: "user", content: `Project items:\n\n${context}\n\nQuestion: ${question}` }],
  });
  if (res.stop_reason === "refusal") return { answer: "The AI declined to answer this question.", sources: [] as Source[] };
  const answer = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  const cited = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  return { answer, sources: sources.filter((s) => cited.has(s.n)) };
}
