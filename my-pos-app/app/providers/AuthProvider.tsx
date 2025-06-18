// app/providers/AuthProvider.tsx
'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // โหลดข้อมูลจาก localStorage เมื่อ Component Mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);
      } catch (e) {
        console.error("Failed to parse stored user or token", e);
        // ถ้าข้อมูลเสีย ให้ลบออก
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    router.push('/pos'); // ไปหน้า POS หลังจาก Login
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/login'); // กลับไปหน้า Login หลังจาก Logout
  };

  // เราอาจจะต้องตรวจสอบ Token หมดอายุในอนาคต แต่สำหรับตอนนี้ แค่มี Token ก็ถือว่า Login แล้ว
  // คุณสามารถเพิ่ม Logic ตรวจสอบ JWT expiry ได้ที่นี่
  // ตัวอย่าง: const isTokenExpired = token ? jwt.decode(token) : false;

  if (loading) {
    // อาจจะแสดง Loading Spinner
    return <div>Loading authentication...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};