import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
      <h2 style={{ fontSize: '3rem', fontWeight: 700, color: '#f97316', marginBottom: '0.5rem' }}>404</h2>
      <p style={{ fontSize: '1.25rem', color: '#333', marginBottom: '1rem' }}>Page not found</p>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>The page you are looking for does not exist.</p>
      <Link
        href="/"
        style={{ padding: '0.75rem 1.5rem', background: '#f97316', color: '#fff', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '1rem' }}
      >
        Go home
      </Link>
    </div>
  );
}
