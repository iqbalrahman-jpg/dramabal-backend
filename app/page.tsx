export default function HomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>dramabal-backend</h1>
      <p>App source list is available at <code>/server/list</code>.</p>
      <p>Bridge API is available at <code>/server/[app]/list</code>.</p>
      <p>Health check is available at <code>/health</code>.</p>
    </main>
  );
}
