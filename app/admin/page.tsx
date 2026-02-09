export default function AdminDashboard() {
  return (
    <div className="max-w-7xl">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-glass rounded border border-blue-900/30">
          <p className="text-gray-400 text-sm mb-2">Total Users</p>
          <p className="text-4xl font-bold text-blue-400">1,247</p>
          <p className="text-gray-500 text-xs mt-2">+12% this month</p>
        </div>
        <div className="p-6 bg-glass rounded border border-blue-900/30">
          <p className="text-gray-400 text-sm mb-2">Active Subscriptions</p>
          <p className="text-4xl font-bold text-blue-400">892</p>
          <p className="text-gray-500 text-xs mt-2">Pro: 756, Plus: 136</p>
        </div>
        <div className="p-6 bg-glass rounded border border-blue-900/30">
          <p className="text-gray-400 text-sm mb-2">API Requests</p>
          <p className="text-4xl font-bold text-blue-400">2.3M</p>
          <p className="text-gray-500 text-xs mt-2">Today</p>
        </div>
        <div className="p-6 bg-glass rounded border border-blue-900/30">
          <p className="text-gray-400 text-sm mb-2">Revenue</p>
          <p className="text-4xl font-bold text-blue-400">$45.2K</p>
          <p className="text-gray-500 text-xs mt-2">This month</p>
        </div>
      </div>

      {/* Recent Users */}
      <div className="p-6 bg-glass rounded border border-blue-900/30">
        <h2 className="text-lg font-bold mb-4">Recent Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-900/20">
                <th className="px-4 py-3 text-left text-gray-400 font-semibold">Email</th>
                <th className="px-4 py-3 text-left text-gray-400 font-semibold">Plan</th>
                <th className="px-4 py-3 text-left text-gray-400 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {[
                { email: 'user1@example.com', plan: 'Pro', joined: '2 days ago' },
                { email: 'user2@example.com', plan: 'Free', joined: '1 day ago' },
                { email: 'user3@example.com', plan: 'Pro Plus', joined: '5 hours ago' },
              ].map((user, i) => (
                <tr key={i} className="border-b border-blue-900/20">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.plan}</td>
                  <td className="px-4 py-3 text-gray-400">{user.joined}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
