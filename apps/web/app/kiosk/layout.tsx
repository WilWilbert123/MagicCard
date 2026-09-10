'use client';

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#070a11] text-white flex flex-col justify-center items-center select-none overflow-hidden touch-none font-sans relative">
      {children}
    </div>
  );
}
