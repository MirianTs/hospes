import { lazy, Suspense } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import { Loading } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import MapSearch from './pages/MapSearch.jsx';
import HotelPage from './pages/HotelPage.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Cabinet from './pages/Cabinet.jsx';
import BookingPage from './pages/BookingPage.jsx';
import CheckIn from './pages/CheckIn.jsx';
import ExtraServices from './pages/ExtraServices.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import Admin from './pages/Admin.jsx';
import CardAccess from './pages/CardAccess.jsx';
import NotFound from './pages/NotFound.jsx';

// face-api (~1.5 MB) loads only when someone opens the verification page.
const Verify = lazy(() => import('./pages/Verify.jsx'));

const guarded = (el, roles) => <RequireAuth roles={roles}>{el}</RequireAuth>;

// Remount per booking id, so state from one booking never shows on another.
function KeyedById({ page: Page }) {
  const { id } = useParams();
  return <Page key={id} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Catalog />} />
        <Route path="map" element={<MapSearch />} />
        <Route path="hotels/:id" element={<HotelPage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route
          path="verify"
          element={guarded(
            <Suspense fallback={<Loading />}>
              <Verify />
            </Suspense>,
          )}
        />
        <Route path="cabinet" element={guarded(<Cabinet />)} />
        <Route path="bookings/:id" element={guarded(<KeyedById page={BookingPage} />)} />
        <Route path="bookings/:id/services" element={guarded(<KeyedById page={ExtraServices} />)} />
        <Route path="checkin/:id" element={guarded(<KeyedById page={CheckIn} />)} />
        <Route path="owner" element={guarded(<OwnerDashboard />, ['owner', 'admin'])} />
        <Route path="admin" element={guarded(<Admin />, ['admin'])} />
        <Route path="lock" element={guarded(<CardAccess />, ['admin'])} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
