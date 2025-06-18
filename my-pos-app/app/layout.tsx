// app/layout.tsx
import './globals.css'; // Global CSS ของ Tailwind
import { Inter } from 'next/font/google';
import Link from 'next/link';
import AuthProvider from './providers/AuthProvider'; // เราจะสร้าง AuthProvider ในขั้นตอนต่อไป

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'KNC shop',
  description: 'KNC shop Point of Sale System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider> {/* ครอบด้วย AuthProvider */}
          <header className="bg-blue-700 text-white p-4 shadow-md">
            <nav className="container mx-auto flex justify-between items-center">
              <Link href="/" className="text-2xl font-bold">
                KNC Shop
              </Link>
              <ul className="flex space-x-6">
                <li>
                  <Link href="/pos" className="hover:text-blue-200">
                    POS
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/products" className="hover:text-blue-200">
                    Products
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/customers" className="hover:text-blue-200">
                    Customers
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/reports/sales" className="hover:text-blue-200">
                    Reports
                  </Link>
                </li>
                {/* อาจจะเพิ่มปุ่ม Logout ที่นี่ */}
                <li>
                  <Link href="/login" className="hover:text-blue-200">
                    Login
                  </Link>
                </li>
              </ul>
            </nav>
          </header>
          <main className="container mx-auto mt-4">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}