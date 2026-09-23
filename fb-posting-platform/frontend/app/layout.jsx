import "./globals.css";

export const metadata = {
  title: "FB Auto Publisher",
  description: "Automatic Facebook page post publishing"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
