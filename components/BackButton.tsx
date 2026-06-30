'use client';

import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Go back"
      className="fixed bottom-6 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-gray-700 bg-gray-900/90 shadow-lg backdrop-blur-sm transition-colors hover:border-green-600 hover:bg-gray-800"
    >
      <svg
        className="h-5 w-5 text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
    </button>
  );
}
