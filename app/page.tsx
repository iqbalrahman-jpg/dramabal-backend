export default function HomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>dramabal-backend</h1>
      <p>App source list is available at <code>/v1/server/list</code>.</p>
      <p>Dashboard is available at <code>/v1/[app]/dashboard</code>.</p>
      <p>Search is available at <code>/v1/[app]/search?name=...</code>.</p>
      <p>Drama detail is available at <code>/v1/[app]/detail/[id]</code>.</p>
      <p>Episodes list is available at <code>/v1/[app]/episodes/[id]</code>.</p>
      <p>Episode detail is available at <code>/v1/[app]/episode/[slug]</code>.</p>
      <p>Health check is available at <code>/health</code>.</p>
    </main>
  );
}
