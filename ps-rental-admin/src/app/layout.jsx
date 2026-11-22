import './globals.css';

export const metadata = {
  title: 'PS Rental Hub — Website Admin (Next.js)',
  description: 'Sistem Informasi Pengelolaan Rental PlayStation Berbasis Web',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
