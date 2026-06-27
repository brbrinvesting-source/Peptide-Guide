import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-green-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-100 mb-2">Page Not Found</h2>
        <p className="text-gray-400 mb-8">The peptide or page you&apos;re looking for doesn&apos;t exist.</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/peptides"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-100 rounded-lg font-medium transition-colors border border-gray-700"
          >
            Browse Library
          </Link>
        </div>
      </div>
    </div>
  );
}
