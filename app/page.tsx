import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Welcome to BountyCam</h1>
        <p className="text-xl mb-8 text-gray-600">
          Post geo-targeted bounties and get live streams from your desired locations
        </p>
        <div className="space-x-4">
          <Link
            href="/auth"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition"
          >
            Get Started
          </Link>
          <Link
            href="/bounties"
            className="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300 transition"
          >
            Browse Bounties
          </Link>
        </div>
      </div>
    </main>
  )
}