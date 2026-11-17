import { createFolder } from "@/app/app/actions";
import { COLORS } from "@/lib/catalog";

export function NewFolder({ projectId, parentId }: { projectId: string; parentId?: string }) {
  return (
    <details className="drawer card" style={{ minHeight: 150 }}>
      <summary className="tile tile-new" style={{ height: "100%", minHeight: 150 }}>
        <span className="mono">+ New folder</span>
      </summary>
      <form action={createFolder} className="stack-sm pad" style={{ paddingTop: 0 }}>
        <input type="hidden" name="projectId" value={projectId} />
        {parentId && <input type="hidden" name="parentId" value={parentId} />}
        <input className="input" name="name" placeholder="Folder name" required />
        <div className="row-wrap">
          {COLORS.map((c, i) => (
            <label key={c} className="row" style={{ gap: 4 }}>
              <input type="radio" name="color" value={c} defaultChecked={i === 0} />
              <span className={`sq c-${c}`} />
            </label>
          ))}
        </div>
        <label className="row label"><input type="checkbox" name="restricted" /> Restricted · only me until I add people</label>
        <button className="btn">Create</button>
      </form>
    </details>
  );
}
