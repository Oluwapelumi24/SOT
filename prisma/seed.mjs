// Demo data for local development. Accounts all use the password below.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = "sot-demo-2026";

const people = [
  { email: "ada@demo.sot", name: "Ada Okafor", userType: "product_manager", role: "OWNER", department: "Product", project: "OWNER" },
  { email: "tunde@demo.sot", name: "Tunde Bello", userType: "engineer", role: "MEMBER", department: "Engineering", project: "EDITOR" },
  { email: "mira@demo.sot", name: "Mira Chen", userType: "designer", role: "MEMBER", department: "Design", project: "CONTRIBUTOR" },
  { email: "funmi@demo.sot", name: "Funmi Adeyemi", userType: "finance", role: "MEMBER", department: "Finance", project: "VIEWER" },
];

async function main() {
  if (await db.user.findUnique({ where: { email: people[0].email } })) return console.log("Demo data already there.");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const users = {};
  for (const p of people) users[p.email] = await db.user.create({ data: { email: p.email, name: p.name, userType: p.userType, passwordHash: hash } });
  const ada = users["ada@demo.sot"];
  const ws = await db.workspace.create({ data: { name: "Acme Inc." } });
  for (const p of people) await db.membership.create({ data: { userId: users[p.email].id, workspaceId: ws.id, role: p.role, department: p.department } });

  const proj = await db.project.create({ data: { workspaceId: ws.id, name: "Checkout revamp", description: "Faster, safer checkout for web and mobile", createdById: ada.id } });
  for (const p of people) await db.projectMember.create({ data: { projectId: proj.id, userId: users[p.email].id, role: p.project } });
  const sub = await db.project.create({ data: { workspaceId: ws.id, parentId: proj.id, name: "Mobile app", description: "iOS and Android checkout", createdById: ada.id } });

  const folder = (name, color, extra = {}) => db.folder.create({ data: { projectId: proj.id, name, color, createdById: ada.id, ...extra } });
  const prds = await folder("PRDs", "green");
  const designs = await folder("Designs", "purple");
  const arch = await folder("Architecture", "blue");
  const decisions = await folder("Decisions", "amber");
  const budget = await folder("Budget", "red", { restricted: true, sensitivity: "RESTRICTED", access: { create: [{ department: "Finance" }] } });
  await db.folder.create({ data: { projectId: sub.id, name: "Flows", color: "purple", createdById: ada.id } });

  const item = (folderId, ownerId, data) => db.item.create({ data: { folderId, ownerId, ...data } });
  await item(prds.id, ada.id, { type: "NOTE", title: "Checkout revamp PRD", content: "Goal: cut checkout drop-off from 38% to 25% by Q2.\n\nScope: guest checkout, saved cards, payment retries (up to 3 attempts with backoff), Apple Pay and Google Pay.\n\nOut of scope: subscriptions, crypto." });
  await item(decisions.id, ada.id, { type: "NOTE", title: "Decision: retry failed payments 3 times", content: "Decided on 4 Nov with Engineering. Retry at 2s, 10s and 60s, then show the 'try another card' screen. Owner: Tunde." });
  await item(designs.id, users["mira@demo.sot"].id, { type: "LINK", provider: "figma", url: "https://www.figma.com/design/abc123/Checkout-flow-v4", title: "Checkout flow v4", content: "Final for dev handoff" });
  await item(arch.id, users["tunde@demo.sot"].id, { type: "LINK", provider: "github", url: "https://github.com/acme/checkout-service/pull/481", title: "PR #481 · payment retry worker" });
  await item(arch.id, users["tunde@demo.sot"].id, { type: "LINK", provider: "jira", url: "https://acme.atlassian.net/browse/CHK-212", title: "CHK-212 · Retry payments epic" });
  await item(budget.id, users["funmi@demo.sot"].id, { type: "NOTE", title: "Q1 budget: checkout revamp", content: "Total: $84,000. Contractors $52k, payment provider fees $18k, user research $14k." });
  await db.connection.createMany({ data: [{ workspaceId: ws.id, provider: "figma" }, { workspaceId: ws.id, provider: "github" }, { workspaceId: ws.id, provider: "jira" }] });
  await db.auditEvent.create({ data: { workspaceId: ws.id, actorId: ada.id, action: "seeded demo workspace", target: "Acme Inc." } });
  console.log(`Seeded. Sign in as any of: ${people.map((p) => p.email).join(", ")} · password: ${PASSWORD}`);
}

main().finally(() => db.$disconnect());
