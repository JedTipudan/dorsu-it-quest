/** Re-mounts on every navigation inside the app, so each screen "loads in" like a game menu. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-screen-in">{children}</div>
}
