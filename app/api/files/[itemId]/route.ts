import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/session";
import { folderAccess } from "@/lib/access";
import { audit } from "@/lib/audit";

export async function GET(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const userId = await currentUserId();
  if (!userId) return new Response("Sign in required", { status: 401 });
  const item = await db.item.findUnique({ where: { id: itemId }, include: { folder: { include: { project: true } } } });
  if (!item?.filePath) return new Response("Not found", { status: 404 });
  const workspaceId = item.folder.project.workspaceId;
  if (!(await folderAccess({ userId, workspaceId }, item.folderId))) return new Response("Not found", { status: 404 });

  const buf = await readFile(path.join(process.cwd(), "uploads", path.basename(item.filePath)));
  const download = new URL(req.url).searchParams.has("download");
  if (download) await audit(workspaceId, userId, "downloaded", item.title);
  const name = encodeURIComponent(item.title);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": item.mimeType || "application/octet-stream",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      // Uploaded HTML/SVG must never run as the app. PDFs need the browser's viewer, so no sandbox for them.
      "Content-Security-Policy": item.mimeType?.includes("pdf") ? "default-src 'none'; object-src 'self'" : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
