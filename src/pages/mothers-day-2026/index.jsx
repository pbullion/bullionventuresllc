import React, { useState, useEffect } from "react";

const PETALS = [
  { e: "🌸", l: "4%", d: "0s", dur: "13s", s: "1.3rem" },
  { e: "�", l: "14%", d: "3.5s", dur: "16s", s: "1.0rem" },
  { e: "🌸", l: "24%", d: "1.2s", dur: "19s", s: "0.9rem" },
  { e: "💮", l: "36%", d: "5.8s", dur: "14s", s: "1.1rem" },
  { e: "🌸", l: "48%", d: "2.4s", dur: "17s", s: "1.1rem" },
  { e: "🌷", l: "60%", d: "7.1s", dur: "12s", s: "1.2rem" },
  { e: "🌸", l: "72%", d: "4.0s", dur: "18s", s: "0.9rem" },
  { e: "💮", l: "83%", d: "0.8s", dur: "20s", s: "1.0rem" },
  { e: "🌸", l: "93%", d: "6.2s", dur: "15s", s: "1.2rem" },
];

const PHOTOS = [
  "/images/spa/trellis1.png",
  "/images/spa/trellis2.png",
  "/images/spa/trellis3.png",
  "/images/spa/trellis4.png",
  "/images/spa/trellis6.png",
];

const SERVICES = [
  { icon: "💆‍♀️", name: "Massage Therapy" },
  { icon: "✨", name: "Luxury Facial" },
  { icon: "🛁", name: "Body Ritual" },
  { icon: "🍷", name: "Wine & Dining" },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Dancing+Script:wght@600;700&family=Lato:wght@300;400;700&display=swap');

  .md-page * { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes mdFloatPetal {
    0%   { transform: translateY(105vh) rotate(0deg);   opacity: 0; }
    6%   { opacity: 1; }
    92%  { opacity: 0.7; }
    100% { transform: translateY(-12vh) rotate(380deg); opacity: 0; }
  }
  @keyframes mdFadeInUp {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes mdFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes mdGoldShimmer {
    0%   { background-position: -300% center; }
    100% { background-position: 300% center; }
  }
  @keyframes mdHeartbeat {
    0%, 100% { transform: scale(1); }
    14%  { transform: scale(1.22); }
    28%  { transform: scale(1); }
    42%  { transform: scale(1.12); }
    70%  { transform: scale(1); }
  }
  @keyframes mdCardGlow {
    0%, 100% { box-shadow: 0 6px 30px rgba(180,80,160,0.25), 0 2px 8px rgba(0,0,0,0.15); }
    50%       { box-shadow: 0 8px 44px rgba(180,80,160,0.55), 0 2px 8px rgba(0,0,0,0.15); }
  }

  .md-page {
    background: #fdf5f9;
    min-height: 100vh;
    font-family: 'Lato', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #2a1a2e;
    overflow-x: hidden;
    max-width: 480px;
    margin: 0 auto;
  }

  /* ── Floating Petals ─────────────────────────────────────── */
  .md-petal {
    position: fixed;
    animation: mdFloatPetal linear infinite;
    z-index: 0;
    pointer-events: none;
    user-select: none;
    bottom: -5%;
  }

  /* ── Hero ────────────────────────────────────────────────── */
  .md-hero {
    background: url('/images/spa/trellis5.png') 35% center / cover no-repeat;
    padding: 80px 28px 108px;
    text-align: center;
    position: relative;
    overflow: hidden;
    z-index: 1;
  }
  .md-hero-dots {
    position: absolute;
    inset: 0;
    background: linear-gradient(155deg, rgba(58,18,72,0.72) 0%, rgba(107,45,130,0.65) 50%, rgba(155,63,170,0.55) 100%);
    pointer-events: none;
  }
  .md-hero::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 0;
    width: 100%; height: 80px;
    background: #fdf5f9;
    clip-path: ellipse(58% 100% at 50% 100%);
  }
  .md-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.1);
    color: #f5c6e8;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 7px 20px;
    border-radius: 30px;
    border: 1px solid rgba(245,198,232,0.28);
    margin-bottom: 30px;
    animation: mdFadeIn 1s ease both;
    position: relative;
    z-index: 2;
  }
  .md-hero-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-style: italic;
    font-size: 36px;
    color: rgba(255,240,250,0.92);
    line-height: 1.2;
    margin-bottom: 14px;
    animation: mdFadeInUp 1s ease 0.25s both;
    position: relative;
    z-index: 2;
  }
  .md-hero-name {
    display: block;
    font-family: 'Dancing Script', cursive;
    font-size: 84px;
    font-weight: 700;
    background: linear-gradient(90deg, #f9d0ea, #ffe8f5, #f5badd, #f9d0ea, #ffe8f5);
    background-size: 300% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: mdFadeInUp 1s ease 0.45s both, mdGoldShimmer 5s linear 1.45s infinite;
    position: relative;
    z-index: 2;
    line-height: 1;
    margin-bottom: 22px;
  }
  .md-hero-sub {
    color: rgba(255,255,255,0.95);
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    text-shadow: 0 1px 8px rgba(0,0,0,0.5);
    animation: mdFadeInUp 1s ease 0.65s both;
    position: relative;
    z-index: 2;
  }

  /* ── Section shared ──────────────────────────────────────── */
  .md-section-label {
    text-align: center;
    font-size: 10px;
    color: #b06aaf;
    letter-spacing: 3px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .md-section-title {
    font-family: 'Playfair Display', serif;
    font-size: 27px;
    text-align: center;
    color: #5a1a6e;
    margin-bottom: 32px;
  }

  /* ── Gift Card Section ───────────────────────────────────── */
  .md-gift-section {
    padding: 0 24px 0;
    position: relative;
    z-index: 1;
    background: #fdf5f9;
  }
  .md-card-perspective {
    perspective: 1200px;
    max-width: 340px;
    margin: 0 auto;
  }
  .md-card-inner {
    width: 100%;
    aspect-ratio: 1.6 / 1;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.9s cubic-bezier(0.4,0,0.2,1);
    cursor: pointer;
    border-radius: 20px;
    animation: mdCardGlow 3s ease-in-out infinite;
  }
  .md-card-inner.flipped { transform: rotateY(180deg); }

  .md-card-face {
    position: absolute;
    inset: 0;
    border-radius: 20px;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
  }

  /* Card front */
  .md-card-front {
    background: linear-gradient(135deg, #3a1248 0%, #6b2d82 40%, #9b3faa 70%, #b84fa0 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 22px 26px;
  }
  .md-cf-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .md-cf-spa { font-family: 'Playfair Display', serif; font-size: 17px; color: #f5e6f0; letter-spacing: 1.5px; }
  .md-cf-hotel { font-size: 9px; color: rgba(245,230,240,0.55); letter-spacing: 2.5px; text-transform: uppercase; margin-top: 3px; }
  .md-cf-icon { font-size: 22px; opacity: 0.8; }
  .md-cf-mid {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .md-cf-amount { font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 700; color: #f9d0ea; line-height: 1; text-shadow: 0 2px 16px rgba(249,208,234,0.5); }
  .md-cf-amount-label { font-size: 9px; color: rgba(245,230,240,0.5); letter-spacing: 3px; text-transform: uppercase; margin-top: 4px; }
  .md-cf-bot {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .md-cf-for { font-size: 8px; color: rgba(245,230,240,0.45); letter-spacing: 1.8px; text-transform: uppercase; }
  .md-cf-decor { font-size: 11px; color: rgba(245,230,240,0.28); letter-spacing: 2px; }

  /* Card back */
  .md-card-back {
    background: linear-gradient(135deg, #6b1060 0%, #a0277a 50%, #c44e90 100%);
    transform: rotateY(180deg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 22px;
    text-align: center;
    gap: 10px;
  }
  .md-cb-heart { font-size: 26px; }
  .md-cb-msg { font-family: 'Playfair Display', serif; font-style: italic; font-size: 14px; color: rgba(255,232,248,0.92); line-height: 1.55; }
  .md-cb-sig { font-family: 'Dancing Script', cursive; font-size: 20px; color: #ffc8e8; font-weight: 600; }

  .md-tap-hint {
    text-align: center;
    font-size: 12px;
    color: #c07ab8;
    margin-top: 18px;
    letter-spacing: 0.5px;
    opacity: 0.85;
    animation: mdFadeIn 2.5s ease 2s both;
  }

  /* ── Photo Gallery ───────────────────────────────────────── */
  .md-gallery-section {
    background: white;
    padding: 52px 0 52px;
    position: relative;
    overflow: hidden;
  }
  .md-gallery-section::before {
    content: '';
    position: absolute;
    top: -1px; left: 0;
    width: 100%; height: 60px;
    background: #fdf5f9;
    clip-path: ellipse(58% 100% at 50% 0%);
  }
  .md-gallery-label { padding-top: 32px; padding-left: 24px; padding-right: 24px; }
  .md-gallery-title { padding-left: 24px; padding-right: 24px; }
  .md-gallery-strip {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 0 24px 16px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-snap-type: x mandatory;
  }
  .md-gallery-strip::-webkit-scrollbar { display: none; }
  .md-gallery-item {
    flex: 0 0 260px;
    scroll-snap-align: start;
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 4px 20px rgba(90,26,110,0.14);
  }
  .md-gallery-img {
    width: 100%;
    height: 180px;
    object-fit: cover;
    display: block;
  }
  .md-gallery-caption {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    background: linear-gradient(to top, rgba(58,18,72,0.82) 0%, transparent 100%);
    color: rgba(255,230,248,0.92);
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 24px 14px 12px;
    font-weight: 400;
  }
  .md-gallery-scroll-hint {
    text-align: center;
    font-size: 11px;
    color: #c07ab8;
    letter-spacing: 1px;
    margin-top: 6px;
    opacity: 0.75;
  }

  /* ── Spa Section ─────────────────────────────────────────── */
  .md-spa-section {
    background: linear-gradient(155deg, #3a1248 0%, #6b2d82 55%, #9b3faa 100%);
    padding: 64px 28px 64px;
    text-align: center;
    position: relative;
  }
  .md-spa-section::before {
    content: '';
    position: absolute;
    top: -1px; left: 0;
    width: 100%; height: 60px;
    background: white;
    clip-path: ellipse(58% 100% at 50% 0%);
  }
  .md-spa-inner { padding-top: 30px; }
  .md-spa-title { font-family: 'Playfair Display', serif; font-size: 32px; color: #fce4f5; letter-spacing: 1px; margin-bottom: 6px; }
  .md-spa-sub { font-size: 10px; color: rgba(252,228,245,0.55); letter-spacing: 3px; text-transform: uppercase; margin-bottom: 24px; }
  .md-spa-divider { width: 60px; height: 1px; background: linear-gradient(to right, transparent, #f9c0e0, transparent); margin: 0 auto 26px; }
  .md-spa-desc { color: rgba(252,228,245,0.82); font-size: 14px; line-height: 1.78; max-width: 360px; margin: 0 auto 36px; font-weight: 300; }
  .md-spa-services { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 340px; margin: 0 auto; }
  .md-spa-service {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(249,192,224,0.22);
    border-radius: 16px;
    padding: 18px 12px;
    text-align: center;
  }
  .md-srv-icon { font-size: 26px; display: block; margin-bottom: 7px; }
  .md-srv-name { font-size: 10px; color: #f9c0e0; letter-spacing: 1.8px; text-transform: uppercase; }

  /* ── Message Section ─────────────────────────────────────── */
  .md-msg-section {
    background: linear-gradient(160deg, #fdf0f8 0%, #fdf5f9 60%, #f8eef8 100%);
    padding: 88px 24px 60px;
    text-align: center;
    position: relative;
  }
  .md-msg-section::before {
    content: '';
    position: absolute;
    top: -1px; left: 0;
    width: 100%; height: 70px;
    background: linear-gradient(155deg, #3a1248, #6b2d82);
    clip-path: ellipse(58% 100% at 50% 0%);
  }
  .md-msg-title { color: #3a1a48; }
  .md-heart { font-size: 52px; display: block; margin: 0 auto 28px; animation: mdHeartbeat 2.8s ease-in-out infinite; }
  .md-msg-card {
    background: white;
    border-radius: 24px;
    padding: 34px 28px 28px;
    box-shadow: 0 8px 40px rgba(107,45,130,0.1), 0 2px 8px rgba(0,0,0,0.04);
    max-width: 380px;
    margin: 0 auto;
    position: relative;
    border: 1px solid rgba(180,80,160,0.12);
  }
  .md-msg-quote {
    font-family: 'Playfair Display', serif;
    font-size: 96px;
    color: #f5d0ec;
    position: absolute;
    top: -8px; left: 16px;
    line-height: 1;
    user-select: none;
  }
  .md-msg-text {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-size: 19px;
    line-height: 1.68;
    color: #3a1a48;
    margin-bottom: 26px;
    padding-top: 38px;
    position: relative;
    z-index: 1;
  }
  .md-msg-divider { width: 42px; height: 1px; background: linear-gradient(to right, transparent, #b06aaf, transparent); margin: 0 auto 20px; }
  .md-msg-sig { font-family: 'Dancing Script', cursive; font-size: 27px; color: #9b3faa; font-weight: 600; }

  /* ── Footer ──────────────────────────────────────────────── */
  .md-footer {
    background: #3a1248;
    padding: 34px 24px;
    text-align: center;
  }
  .md-footer-text { color: rgba(245,198,232,0.45); font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; }
  .md-footer-star { color: #f9c0e0; font-size: 16px; }
`;

export default function MothersDayGiftCard() {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "md-gift-styles";
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById("md-gift-styles");
      if (el) el.remove();
    };
  }, []);

  return (
    <div className="md-page">
      {/* Floating petals */}
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="md-petal"
          style={{ left: p.l, fontSize: p.s, animationDuration: p.dur, animationDelay: p.d }}>
          {p.e}
        </span>
      ))}

      {/* ── Hero ── */}
      <section className="md-hero">
        <div className="md-hero-dots" />
        <h1 className="md-hero-title">Happy Mother's Day</h1>
        <span className="md-hero-name">MAMA</span>
        <p className="md-hero-sub">from the two who love you most</p>
      </section>

      {/* ── Gift Card ── */}
      <section className="md-gift-section">
        <h2 className="md-section-title">A Day of Pure Bliss</h2>

        <div className="md-card-perspective">
          <div
            className={`md-card-inner${flipped ? " flipped" : ""}`}
            onClick={() => setFlipped((v) => !v)}
            role="button"
            aria-label="Flip gift card">
            {/* Front */}
            <div className="md-card-face md-card-front">
              <div className="md-cf-top">
                <div>
                  <div className="md-cf-spa">Trellis Spa</div>
                  <div className="md-cf-hotel">The Houstonian · Houston, TX</div>
                </div>
                <span className="md-cf-icon">�</span>
              </div>
              <div className="md-cf-mid">
                <div className="md-cf-amount">$200</div>
                <div className="md-cf-amount-label">Gift Card</div>
              </div>
              <div className="md-cf-bot">
                <div className="md-cf-for">For Ashley · Mother's Day 2026</div>
                <div className="md-cf-decor">✦ ✦ ✦</div>
              </div>
            </div>

            {/* Back */}
            <div className="md-card-face md-card-back">
              <span className="md-cb-heart">💝</span>
              <p className="md-cb-msg">
                "We LOVE you so much!
                <br />
                Happy Mother's Day!
                <br />
                Thank you for putting up with us!!"
              </p>
              <div className="md-cb-sig">Love, Patrick &amp; Thomas</div>
            </div>
          </div>
        </div>

        <p className="md-tap-hint">{flipped ? "💝 tap to flip back" : "✨ tap the card to reveal a message"}</p>
      </section>

      {/* ── Photo Gallery ── */}
      <section className="md-gallery-section">
        <p className="md-section-label md-gallery-label">Inside Trellis Spa</p>
        <h2 className="md-section-title md-gallery-title">Your Sanctuary Awaits</h2>

        <div className="md-gallery-strip">
          {PHOTOS.map((src, i) => (
            <div key={i} className="md-gallery-item">
              <img src={src} alt="" className="md-gallery-img" loading="lazy" />
            </div>
          ))}
        </div>
        <p className="md-gallery-scroll-hint">← swipe to explore →</p>
      </section>

      {/* ── Personal Message ── */}
      <section className="md-msg-section">
        <span className="md-heart">💜</span>
        <p className="md-section-label">From Us to You</p>
        <h2 className="md-section-title md-msg-title" style={{ marginBottom: "28px" }}>
          With All Our Love
        </h2>

        <div className="md-msg-card">
          <div className="md-msg-quote">"</div>
          <p className="md-msg-text">We LOVE you so much, Happy Mother's Day! Thank you for putting up with us!!</p>
          <div className="md-msg-divider" />
          <div className="md-msg-sig">Love, Patrick &amp; Thomas 💜</div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="md-footer">
        <div className="md-footer-text">Trellis Spa · The Houstonian · Houston, TX</div>
        <div className="md-footer-star">✦</div>
      </footer>
    </div>
  );
}
