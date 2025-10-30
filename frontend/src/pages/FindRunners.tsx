export default function FindRunners() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Find Runners</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by location..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
            <option>All Categories</option>
            <option>Delivery</option>
            <option>Shopping</option>
            <option>Tech Help</option>
            <option>Assembly</option>
          </select>
          <button className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors">
            Search
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 font-medium">Development in Progress</p>
            <p className="text-sm text-blue-700 mt-1">Map view and runner search functionality will be available after database integration is complete.</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Runner {i}</h3>
                <div className="flex items-center mt-1">
                  <svg className="w-4 h-4 text-primary mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600">Lightning Verified</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center text-sm text-gray-900 font-medium">
                  <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  4.8
                </div>
                <p className="text-xs text-gray-500">42 jobs completed</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Delivery</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Shopping</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Fast and reliable service. Available for local errands.
            </p>
            <button className="w-full bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors">
              Request Job
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
