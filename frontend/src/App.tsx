import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import FindRunners from './pages/FindRunners';
import MyJobs from './pages/MyJobs';
import Profile from './pages/Profile';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="find-runners" element={<FindRunners />} />
        <Route path="my-jobs" element={<MyJobs />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}
