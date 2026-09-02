'use client';

export default function AdminError({ error, reset }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#333', marginBottom: '1rem' }}>
        Admin Error
      </h2>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        {error?.message || 'An unexpected error occurred in the admin panel.'}
      </p>
      <button
        onClick={() => reset()}
        style={{ padding: '0.75rem 1.5rem', background: '#f97316', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' }}
      >
        Try again
      </button>
    </div>
  );
}
