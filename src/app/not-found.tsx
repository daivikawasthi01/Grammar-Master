import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-primary text-3xl">error_outline</span>
        </div>
        <h1 className="text-3xl font-headline font-bold text-on-surface mb-2">Page Not Found</h1>
        <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-primary text-on-primary font-semibold px-6 py-3 rounded-full hover:bg-primary-fixed transition-colors text-sm"
          >
            Return Home
          </Link>
          <Link
            href="/account"
            className="bg-white/5 text-on-surface hover:bg-white/10 border border-white/10 font-medium px-6 py-3 rounded-full transition-colors text-sm"
          >
            My Documents
          </Link>
        </div>
      </div>
    </div>
  );
}
