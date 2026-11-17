export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="brand" style={{ color: dark ? "var(--ink)" : "#fff" }}>
      <span className="logo-dash">
        <i style={{ background: "var(--green)" }} />
        <i style={{ background: dark ? "var(--ink)" : "#fff", width: 10 }} />
      </span>
      SOT
    </span>
  );
}
