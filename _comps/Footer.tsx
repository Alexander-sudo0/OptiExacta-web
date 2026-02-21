import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-blue-900/20 bg-black/50 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold mb-4">VisionEra</h3>
            <p className="text-sm">Advanced facial recognition APIs powered by NIST-ranked technology.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="hover:text-blue-400">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-blue-400">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/nist-ranking" className="hover:text-blue-400">NIST Ranking</Link></li>
              <li><a href="#" className="hover:text-blue-400">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Follow</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-blue-400">Twitter</a></li>
              <li><a href="#" className="hover:text-blue-400">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-blue-900/20 pt-8 flex justify-between text-sm text-gray-500">
          <p>&copy; 2024 VisionEra.</p>
        </div>
      </div>
    </footer>
  )
}
