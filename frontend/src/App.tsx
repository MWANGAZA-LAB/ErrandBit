import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import CreateJob from './pages/CreateJob';
import BrowseJobs from './pages/BrowseJobs';
import JobDetailPage from './pages/JobDetailPage';
import MyJobsPage from './pages/MyJobsPage';
import PaymentPage from './pages/PaymentPage';
import CreateRunnerProfile from './pages/CreateRunnerProfile';
import FindRunnersPage from './pages/FindRunnersPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Routes>
        {/* Login route commented out - authentication bypassed */}
        {/* <Route path="/login" element={<Login />} /> */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="create-job" element={<CreateJob />} />
          <Route path="browse-jobs" element={<BrowseJobs />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="jobs/:id/pay" element={<PaymentPage />} />
          <Route path="my-jobs" element={<MyJobsPage />} />
          <Route path="become-runner" element={<CreateRunnerProfile />} />
          <Route path="find-runners" element={<FindRunnersPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
