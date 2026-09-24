/** Animated "aurora" backdrop (drifting colour blobs, panning grid, rising sparks) used by admin analytics heroes. */
const SPARKS = Array.from({ length: 18 }, (_, i) => ({ left: `${(i * 53) % 100}%`, dur: `${7 + ((i * 7) % 9)}s`, delay: `${(i * 1.3) % 9}s`, size: 2 + (i % 3) }));

export default function Aurora({ as: Tag = 'section', className = '', children, innerRef }) {
  return (
    <Tag ref={innerRef} className={`dash-hero rounded-3xl p-6 shadow-2xl shadow-brand-900/30 sm:p-8 ${className}`}>
      <span className="blob blob-a" /><span className="blob blob-b" /><span className="blob blob-c" /><span className="blob blob-d" />
      <span className="hero-grid" />
      {SPARKS.map((s, i) => <span key={i} className="spark" style={{ left: s.left, animationDuration: s.dur, animationDelay: s.delay, width: s.size, height: s.size }} />)}
      {children}
    </Tag>
  );
}
