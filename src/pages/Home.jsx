import React from 'react';
import { Link } from 'react-router-dom';

const products = [
  {
    emoji: '📋',
    name: 'debriefly',
    path: '/debriefly',
    description:
      'Your personal daily briefing app. Snap photos of schedules, let AI extract the dates and times, and get nightly and weekly summaries delivered as notifications.',
  },
  {
    emoji: '🌙',
    name: 'slumbr',
    path: '/slumbr',
    description:
      'A smart baby monitor app. Stream live video from baby\'s room to your phone, get noise alerts, and play from a library of 13+ built-in lullabies.',
  },
  {
    emoji: '📺',
    name: 'Mancave Displays',
    path: '/mancave-displays',
    description:
      'Live sports odds displays and LED sports tickers for your space. Show real-time betting lines and live scores on a dedicated screen or LED matrix wall.',
  },
  {
    emoji: '🧾',
    name: 'Receipt Tax Tracker',
    path: '/receipt-tax-tracker',
    description:
      'AI-powered receipt scanner that extracts retailer, date, total, and tax info from photos. Track your year-to-date sales tax automatically.',
  },
  {
    emoji: '🎮',
    name: 'Learn & Play!',
    path: '/learn-and-play',
    description:
      'An educational mobile game for kids featuring Bubble Blast and Flashcard games. Learn animals, food, transportation and more through fun interactive gameplay.',
  },
  {
    emoji: '🚗',
    name: 'Tesla Dashboard',
    path: '/tesla-dashboard',
    description:
      'A live sports and weather dashboard designed for Tesla\'s in-car browser. See real-time odds, upcoming games, local weather, and news at a glance.',
  },
];

export default function Home() {
  return (
    <div style={{ backgroundColor: '#0f0f12', color: '#f0f0f5', minHeight: '100%' }}>
      {/* Hero */}
      <div style={{
        padding: '80px 24px 64px',
        textAlign: 'center',
        background: 'linear-gradient(160deg, #1a1a2e 0%, #0f0f12 60%)',
        borderBottom: '1px solid #2a2a45',
      }}>
        <h1 style={{
          fontSize: 48,
          fontWeight: 800,
          margin: '0 0 16px',
          color: '#ffffff',
          letterSpacing: '-1px',
        }}>
          Bullion Ventures LLC
        </h1>
        <p style={{
          fontSize: 20,
          color: '#a0a0b8',
          margin: 0,
          maxWidth: 520,
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: 1.6,
        }}>
          Building apps and tools that make everyday life better.
        </p>
      </div>

      {/* Product grid */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '64px 24px',
      }}>
        <h2 style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#606080',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 32,
          textAlign: 'center',
        }}>
          Our Products
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 24,
        }}>
          {products.map((p) => (
            <div key={p.path} style={{
              backgroundColor: '#1a1a2e',
              border: '1px solid #2a2a45',
              borderRadius: 16,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{ fontSize: 40 }}>{p.emoji}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#ffffff', margin: 0 }}>
                {p.name}
              </h3>
              <p style={{ fontSize: 14, color: '#a0a0b8', lineHeight: 1.65, margin: 0, flex: 1 }}>
                {p.description}
              </p>
              <Link to={p.path} style={{
                display: 'inline-block',
                marginTop: 8,
                padding: '10px 20px',
                backgroundColor: '#6c63ff',
                color: '#ffffff',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                alignSelf: 'flex-start',
              }}>
                Learn More
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
