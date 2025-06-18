// app/page.tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  // ทำการ Redirect ผู้ใช้ไปยังหน้า /login ทันที
  redirect('/login');

  // ส่วนนี้จะไม่ถูก render เพราะมีการ redirect ไปแล้ว
  // แต่จำเป็นต้องมี return เพื่อให้ TypeScript ไม่ฟ้อง Error
  return null;
}