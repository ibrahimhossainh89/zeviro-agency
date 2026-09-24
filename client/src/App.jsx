import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import { PageLoader } from './components/ui';
import { useAuth, STAFF_ROLES } from './context/AuthContext';
import Home from './pages/public/Home';
import ErrorBoundary from './components/ErrorBoundary';
import { PORTAL, IS_STAFF_PORTAL } from './lib/portal';

// Code-split everything except the homepage
const P = (name) => lazy(() => import('./pages/public/Content.jsx').then((m) => ({ default: m[name] })));
const C = (name) => lazy(() => import('./pages/public/Company.jsx').then((m) => ({ default: m[name] })));
const Collection = P('Collection');
const Detail = P('Detail');
const CaseStudies = P('CaseStudies');
const CaseStudyDetail = P('CaseStudyDetail');
const Resources = P('Resources');
const BlogPost = P('BlogPost');
const Faq = P('Faq');
const About = C('About');
const WhyZeviro = C('WhyZeviro');
const Team = C('Team');
const HowWeWork = C('HowWeWork');
const HireUs = lazy(() => import('./pages/public/HireUs.jsx'));
const Policies = lazy(() => import('./pages/public/Policies.jsx').then((m) => ({ default: m.Policies })));
const PolicyDetail = lazy(() => import('./pages/public/Policies.jsx').then((m) => ({ default: m.PolicyDetail })));
const Contact = lazy(() => import('./pages/public/Contact.jsx').then((m) => ({ default: m.Contact })));
const BookCall = lazy(() => import('./pages/public/Contact.jsx').then((m) => ({ default: m.BookCall })));
const Checkout = lazy(() => import('./pages/public/Checkout.jsx'));
const Login = lazy(() => import('./pages/public/Login.jsx'));
const Signup = lazy(() => import('./pages/public/Signup.jsx'));
const ResetPassword = lazy(() => import('./pages/public/ResetPassword.jsx'));
const NotFound = lazy(() => import('./pages/public/NotFound.jsx'));

const AdminApp = lazy(() => import('./pages/admin/AdminApp.jsx'));
const PortalApp = lazy(() => import('./pages/portal/PortalApp.jsx'));

function RequireAuth({ staff, children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  const isStaff = STAFF_ROLES.includes(user.role);
  if (staff && !isStaff) return <Navigate to="/login" replace />;
  if (!staff && isStaff) return <Navigate to="/" replace />;
  return children;
}

// Old URLs → new ones (keeps shared links and search results working)
function RedirectSlug({ to }) {
  const { slug } = useParams();
  return <Navigate to={`${to}/${slug}`} replace />;
}

/** team.zeviro.agency + admin.zeviro.agency: login + dashboard only, no public website. */
function StaffPortalRoutes() {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  return (
    <Routes>
      <Route index element={<Navigate to={user ? '/admin' : '/login'} replace />} />
      <Route path="login" element={<Login variant={PORTAL} />} />
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="admin/*" element={<RequireAuth staff><AdminApp /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** zeviro.agency: public website + client login / signup / portal. */
function WebsiteRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Collection type="services" />} />
        <Route path="services/:slug" element={<Detail type="services" />} />
        <Route path="solutions" element={<Collection type="solutions" />} />
        <Route path="solutions/:slug" element={<Detail type="solutions" />} />
        <Route path="industries" element={<Collection type="industries" />} />
        <Route path="industries/:slug" element={<Detail type="industries" />} />
        <Route path="portfolio" element={<CaseStudies />} />
        <Route path="portfolio/:slug" element={<CaseStudyDetail />} />
        <Route path="case-studies" element={<Navigate to="/portfolio" replace />} />
        <Route path="case-studies/:slug" element={<RedirectSlug to="/portfolio" />} />
        <Route path="hire-us" element={<HireUs />} />
        <Route path="reviews" element={<Navigate to="/hire-us#reviews" replace />} />
        <Route path="resources" element={<Resources />} />
        <Route path="resources/:slug" element={<BlogPost />} />
        <Route path="blog" element={<Navigate to="/resources?type=Blog" replace />} />
        <Route path="faq" element={<Faq />} />
        <Route path="about" element={<About />} />
        <Route path="why-zeviro" element={<WhyZeviro />} />
        <Route path="team" element={<Team />} />
        <Route path="how-we-work" element={<HowWeWork />} />
        <Route path="contact" element={<Contact />} />
        <Route path="book-a-call" element={<BookCall />} />
        <Route path="order/:slug" element={<Checkout />} />
        <Route path="policies" element={<Policies />} />
        <Route path="policies/:slug" element={<PolicyDetail />} />
        <Route path="privacy-policy" element={<Navigate to="/policies/privacy-policy" replace />} />
        <Route path="terms" element={<Navigate to="/policies/terms-of-service" replace />} />
        <Route path="cookie-policy" element={<Navigate to="/policies/cookie-policy" replace />} />
        <Route path="refund-policy" element={<Navigate to="/policies/refund-and-cancellation-policy" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="login" element={<Login variant="client" />} />
      <Route path="signup" element={<Signup />} />
      <Route path="register" element={<Navigate to="/signup" replace />} />
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="portal/*" element={<RequireAuth><PortalApp /></RequireAuth>} />
      {/* The team & admin dashboards live on their own subdomains */}
      <Route path="admin/*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<PageLoader />}>{IS_STAFF_PORTAL ? <StaffPortalRoutes /> : <WebsiteRoutes />}</Suspense>
    </ErrorBoundary>
  );
}
