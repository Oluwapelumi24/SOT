export const USER_TYPES = [
  { id: "product_manager", label: "Product manager", folders: ["PRDs", "Research", "Roadmap", "Decisions"] },
  { id: "project_manager", label: "Project manager", folders: ["Plans", "Status reports", "RAID log", "Meeting notes"] },
  { id: "engineer", label: "Engineer", folders: ["Architecture", "API", "Runbooks", "ADRs"] },
  { id: "designer", label: "Designer", folders: ["Flows", "Designs", "Design system", "Usability tests"] },
  { id: "qa", label: "QA / Test", folders: ["Test plans", "Test cases", "Releases"] },
  { id: "finance", label: "Finance", folders: ["Budget", "Invoices", "Contracts"] },
  { id: "executive", label: "Executive", folders: ["Summaries", "Approvals"] },
  { id: "other", label: "Something else", folders: ["Docs", "Ideas", "Links"] },
] as const;

export const DEPARTMENTS = ["Product", "Engineering", "Design", "QA", "Finance", "Legal", "Operations", "Leadership"];

export const COLORS = ["green", "purple", "amber", "red", "blue", "ink"] as const;

export const PROVIDERS: Record<string, { name: string; color: string; hint: string; match: RegExp | null; capability: string }> = {
  figma: { name: "Figma", color: "purple", hint: "Design files and prototypes", match: /figma\.com/i, capability: "Link + Sync files" },
  jira: { name: "Jira", color: "blue", hint: "Issues, epics and boards", match: /atlassian\.net\/(browse|jira)|jira\./i, capability: "Link + Sync by JQL" },
  github: { name: "GitHub", color: "ink", hint: "Repos, PRs, READMEs, releases", match: /github\.com/i, capability: "Link + Sync repos" },
  notion: { name: "Notion", color: "ink", hint: "Pages and databases", match: /notion\.(so|site)/i, capability: "Link + Sync pages" },
  confluence: { name: "Confluence", color: "blue", hint: "Spaces and page trees", match: /atlassian\.net\/wiki|confluence/i, capability: "Link + Sync spaces" },
  gdrive: { name: "Google Drive", color: "amber", hint: "Docs, Sheets, Slides", match: /docs\.google\.com|drive\.google\.com/i, capability: "Link + Sync folders" },
  slack: { name: "Slack", color: "red", hint: "Threads, unfurls, alerts", match: /slack\.com/i, capability: "Link + notifications" },
  miro: { name: "Miro", color: "amber", hint: "Boards and flows", match: /miro\.com/i, capability: "Link previews" },
  linear: { name: "Linear", color: "purple", hint: "Issues and cycles", match: /linear\.app/i, capability: "Link previews" },
  loom: { name: "Loom", color: "purple", hint: "Video walkthroughs", match: /loom\.com/i, capability: "Link previews" },
  claude: { name: "Claude AI", color: "red", hint: "Ask, summarise, draft", match: null, capability: "Workspace AI" },
};

export function detectProvider(url: string): string {
  for (const [id, p] of Object.entries(PROVIDERS)) if (p.match && p.match.test(url)) return id;
  return "web";
}
