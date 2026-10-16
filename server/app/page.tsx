'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [isLocal, setIsLocal] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const host = window.location.hostname;
    const local = host === 'localhost' || host === '127.0.0.1';
    setIsLocal(local);
  }, []);

  const frontendUrl = isLocal ? 'http://localhost:5173' : 'https://finsense-bw4.pages.dev';
  const displayHost = isLocal ? 'localhost:5173' : 'finsense-bw4.pages.dev';
  const environmentLabel = isLocal ? 'Local Development' : 'Live Production (Vercel & Cloudflare)';
  const description = isLocal
    ? 'This server (port 3000) serves the Next.js API endpoints. The local user interface runs on port 5173.'
    : 'This backend server hosts the Next.js API endpoints on Vercel. The live user interface is hosted on Cloudflare Pages.';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#090d16',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        padding: '2.5rem 2rem',
        borderRadius: '1.25rem',
        backgroundColor: '#111827',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        border: '1px solid #1f2937'
      }}>
        {/* Status Icon */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#059669',
          color: '#ffffff',
          marginBottom: '1.5rem',
          fontSize: '28px',
          boxShadow: '0 0 24px rgba(5, 150, 105, 0.4)'
        }}>
          ✓
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, marginBottom: '0.5rem', color: '#ffffff' }}>
          Backend API is Running!
        </h1>

        {/* Environment Badge */}
        <div style={{
          display: 'inline-block',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '0.3rem 0.75rem',
          borderRadius: '9999px',
          backgroundColor: isLocal ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: isLocal ? '#60a5fa' : '#34d399',
          border: `1px solid ${isLocal ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          marginBottom: '1.25rem'
        }}>
          ● {environmentLabel}
        </div>

        {/* Description */}
        <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.75rem' }}>
          {description}
        </p>

        {/* Primary Redirect Button */}
        <a
          href={frontendUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '0.85rem 2rem',
            borderRadius: '0.625rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 4px 14px 0 rgba(5, 150, 105, 0.39)',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            width: '100%',
            maxWidth: '420px',
            boxSizing: 'border-box'
          }}
        >
          Open FinSense App ({displayHost}) →
        </a>

        {/* Credentials / Direct Link Helper */}
        <div style={{
          padding: '1rem',
          borderRadius: '0.75rem',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid #1e293b',
          fontSize: '0.85rem',
          color: '#cbd5e1',
          textAlign: 'left'
        }}>
          <div style={{ marginBottom: '0.4rem' }}>
            <strong style={{ color: '#e2e8f0' }}>Frontend Link:</strong>{' '}
            <a href={frontendUrl} style={{ color: '#38bdf8', textDecoration: 'underline' }}>
              {frontendUrl}
            </a>
          </div>
          <div>
            <strong style={{ color: '#e2e8f0' }}>Demo Login:</strong>{' '}
            <code style={{ backgroundColor: '#1e293b', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#34d399' }}>name</code>
            {' / '}
            <code style={{ backgroundColor: '#1e293b', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#34d399' }}>demo123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
