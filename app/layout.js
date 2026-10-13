import "./globals.css";

export const metadata = {
  title: "Pastebin Lite",
  description: "Share text with a link. Optionally expire it by time or number of views.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="brand">
            Pastebin<span>Lite</span>
          </a>
          <a href="/" className="new-link">+ New paste</a>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}