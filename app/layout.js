import "./globals.css";
export const metadata = { title: "Nouvelle Lune – Billetterie", description: "Réservez vos tickets en ligne." };
export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <nav className="nav"><div className="seg"><a href="/">Acheter des tickets</a><a href="/admin">Espace administrateur</a></div></nav>
        {children}
      </body>
    </html>
  );
}
