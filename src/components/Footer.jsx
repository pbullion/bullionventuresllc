import React from 'react';
import { Link } from 'react-router-dom';

const products = [
  { label: 'Debriefly', path: '/debriefly' },
  { label: 'Slumbr', path: '/slumbr' },
  { label: 'Mancave Displays', path: '/mancave-displays' },
  { label: 'Sales Tax Tracker', path: '/receipt-tax-tracker' },
  { label: 'Learn & Play!', path: '/learn-and-play' },
];

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#0f0f12',
      borderTop: '1px solid #2a2a45',
      padding: '32px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        {products.map((p) => (
          <Link key={p.path} to={p.path} style={{
            fontSize: 13,
            color: '#6c63ff',
            fontWeight: 500,
          }}>
            {p.label}
          </Link>
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#606080' }}>
        © 2026 Bullion Ventures LLC
      </div>
    </footer>
  );
}
