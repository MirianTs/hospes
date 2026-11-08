import { lazy } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Home from './pages/Home.jsx';

// Every page except Home loads on demand as its own JS chunk (Leaflet only with the map,
// face-api only with verification). Layout shows a spinner meanwhile.
const Catalog = lazy(() => import('./pages/Catalog.jsx'));
const MapSearch = lazy(() => import('./pages/MapSearch.jsx'));
const HotelPage = lazy(() => import('./pages/HotelPage.jsx'));
const Login = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Register })));
const Cabinet = lazy(() => import('./pages/Cabinet.jsx'));
const BookingPage = lazy(() => import('./pages/BookingPage.jsx'));
const CheckIn = lazy(() => import('./pages/CheckIn.jsx'));
const ExtraServices = lazy(() => import('./pages/ExtraServices.jsx'));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard.jsx'));
const Admin = lazy(() => import('./pages/Admin.jsx'));
const CardAccess = lazy(() => import('./pages/CardAccess.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const Credits = lazy(() => import('./pages/Credits.jsx'));
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
        <Route path="credits" element={<Credits />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="verify" element={guarded(<Verify />)} />
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
