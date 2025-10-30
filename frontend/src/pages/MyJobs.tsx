export default function MyJobs() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Jobs</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 font-medium">Development in Progress</p>
            <p className="text-sm text-blue-700 mt-1">Job management functionality will be available after authentication and database integration are complete.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {[
          { id: 1, title: 'Grocery pickup', status: 'In Progress', runner: 'Alex Runner' },
          { id: 2, title: 'Package delivery', status: 'Requested', runner: 'Pending' },
        ].map((job) => (
          <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{job.title}</h3>
                <p className="text-sm text-gray-500 mb-2">Runner: {job.runner}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  job.status === 'In Progress' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {job.status}
                </span>
              </div>
              <button className="text-primary hover:text-orange-600 font-medium text-sm">
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
