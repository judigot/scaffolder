import { FrameworkBadge } from '@/app/framework-badge';

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-500 to-teal-600">
      <div className="bg-white/90 rounded-3xl shadow-2xl px-10 py-16">
        <FrameworkBadge />
        <h1 className="text-5xl md:text-6xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600 drop-shadow-lg tracking-tight">
          Next.js App Router BFF
        </h1>
        <p className="mt-6 text-center text-gray-600">
          GET /api/health · GET /api/hello
        </p>
      </div>
    </div>
  );
}
