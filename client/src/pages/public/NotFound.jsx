import { Link } from 'react-router-dom';
import Seo from '../../components/Seo';

export default function NotFound() {
  return (
    <section className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <Seo title="Page not found" noindex />
      <p className="font-display text-7xl font-bold text-gradient">404</p>
      <h1 className="mt-4 text-2xl font-semibold">This page doesn't exist</h1>
      <p className="mt-2 text-slate-400">It may have moved, or the link might be wrong.</p>
      <div className="mt-8 flex gap-3">
        <Link to="/" className="btn-primary">Back to home</Link>
        <Link to="/contact" className="btn-ghost">Contact us</Link>
      </div>
    </section>
  );
}
