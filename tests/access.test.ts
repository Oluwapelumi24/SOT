import { test } from "node:test";
import assert from "node:assert/strict";
import { canSeeFolder, effectiveProjectRole, can } from "../lib/access-core.ts";

const proj = (id: string, members: { userId: string; role: string }[] = []) => ({ id, members });
const folder = (o: Partial<{ restricted: boolean; createdById: string; access: { userId: string | null; department: string | null }[] }> = {}) =>
  ({ id: Math.random().toString(), restricted: false, createdById: "owner", access: [], ...o });

test("member inherits role from nearest ancestor project", () => {
  const chain = [proj("sub"), proj("parent", [{ userId: "u", role: "EDITOR" }])];
  assert.equal(effectiveProjectRole("u", "MEMBER", chain), "EDITOR");
});

test("direct role on sub-project beats inherited one", () => {
  const chain = [proj("sub", [{ userId: "u", role: "VIEWER" }]), proj("parent", [{ userId: "u", role: "OWNER" }])];
  assert.equal(effectiveProjectRole("u", "MEMBER", chain), "VIEWER");
});

test("guests never inherit", () => {
  const chain = [proj("sub"), proj("parent", [{ userId: "u", role: "EDITOR" }])];
  assert.equal(effectiveProjectRole("u", "GUEST", chain), null);
});

test("non-member of workspace gets nothing", () => {
  assert.equal(effectiveProjectRole("u", null, [proj("p", [{ userId: "u", role: "OWNER" }])]), null);
});

test("finance folder hidden from engineer, visible to finance", () => {
  const budget = folder({ restricted: true, access: [{ userId: null, department: "Finance" }] });
  assert.equal(canSeeFolder({ id: "eng", department: "Engineering" }, "EDITOR", [budget]), false);
  assert.equal(canSeeFolder({ id: "fin", department: "finance" }, "VIEWER", [budget]), true);
});

test("restriction on a parent hides sub-folders", () => {
  const parent = folder({ restricted: true, access: [{ userId: "a", department: null }] });
  const child = folder();
  assert.equal(canSeeFolder({ id: "b", department: null }, "OWNER", [child, parent]), false);
  assert.equal(canSeeFolder({ id: "a", department: null }, "VIEWER", [child, parent]), true);
});

test("creator always sees their restricted folder; project OWNER role does not bypass", () => {
  const f = folder({ restricted: true, createdById: "c" });
  assert.equal(canSeeFolder({ id: "c", department: null }, "VIEWER", [f]), true);
  assert.equal(canSeeFolder({ id: "admin", department: null }, "OWNER", [f]), false);
});

test("role capabilities", () => {
  assert.equal(can.upload("VIEWER"), false);
  assert.equal(can.upload("CONTRIBUTOR"), true);
  assert.equal(can.edit("CONTRIBUTOR"), false);
  assert.equal(can.manage("EDITOR"), false);
  assert.equal(can.manage("OWNER"), true);
});
