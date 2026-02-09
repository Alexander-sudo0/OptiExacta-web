import Header from '@/_comps/layout/Header'
import Footer from '@/_comps/Footer'

export default function NISTRanking() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="mb-16">
            <h1 className="text-5xl font-bold mb-4">
              NIST Ranked <span className="text-blue-400">#1</span> Facial Recognition
            </h1>
            <p className="text-xl text-gray-400">
              OptiExacta Labs achieved the highest accuracy scores in the NIST Face Recognition Vendor Test (FRVT),
              cementing our position as the leader in facial recognition technology.
            </p>
          </div>

          {/* Rankings Table */}
          <div className="overflow-x-auto mb-16">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-900/30">
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Rank</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Vendor</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Accuracy</th>
                  <th className="px-6 py-4 text-left text-gray-400 font-semibold">Speed (ms)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-blue-900/30 bg-blue-600/10">
                  <td className="px-6 py-4 font-bold text-blue-400">1st</td>
                  <td className="px-6 py-4 font-semibold">OptiExacta Labs</td>
                  <td className="px-6 py-4">99.85%</td>
                  <td className="px-6 py-4">45ms</td>
                </tr>
                <tr className="border-b border-blue-900/30">
                  <td className="px-6 py-4 text-gray-400">2nd</td>
                  <td className="px-6 py-4 text-gray-400">TechCorp</td>
                  <td className="px-6 py-4 text-gray-400">99.72%</td>
                  <td className="px-6 py-4 text-gray-400">62ms</td>
                </tr>
                <tr className="border-b border-blue-900/30">
                  <td className="px-6 py-4 text-gray-400">3rd</td>
                  <td className="px-6 py-4 text-gray-400">BioFace Inc</td>
                  <td className="px-6 py-4 text-gray-400">99.61%</td>
                  <td className="px-6 py-4 text-gray-400">78ms</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="p-8 bg-glass rounded border border-blue-900/30">
              <p className="text-4xl font-bold text-blue-400 mb-2">99.85%</p>
              <p className="text-gray-400">Accuracy on NIST Test Set</p>
            </div>
            <div className="p-8 bg-glass rounded border border-blue-900/30">
              <p className="text-4xl font-bold text-blue-400 mb-2">45ms</p>
              <p className="text-gray-400">Average Processing Time</p>
            </div>
            <div className="p-8 bg-glass rounded border border-blue-900/30">
              <p className="text-4xl font-bold text-blue-400 mb-2">2023</p>
              <p className="text-gray-400">Latest NIST FRVT Results</p>
            </div>
          </div>

          {/* Details */}
          <div className="p-8 bg-glass rounded border border-blue-900/30">
            <h2 className="text-2xl font-bold mb-4">What This Means</h2>
            <ul className="space-y-4 text-gray-400">
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Highest accuracy in facial recognition - 99.85% on NIST test set</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Enterprise-grade reliability with consistent performance</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Optimized for speed without sacrificing accuracy</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-400 font-bold">✓</span>
                <span>Trusted by government agencies and enterprises worldwide</span>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
