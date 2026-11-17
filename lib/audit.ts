import { db } from "./db";

export function audit(workspaceId: string, actorId: string, action: string, target: string) {
  return db.auditEvent.create({ data: { workspaceId, actorId, action, target } });
}
