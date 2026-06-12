import { Dumbbell } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500 text-black shadow-glow">
          <Dumbbell size={24} />
        </div>
        <span className="text-2xl font-black tracking-tight">FastResult</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
