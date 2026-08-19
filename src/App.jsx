import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";

import Home from "./pages/Home.jsx";
import DebrieflyHome from "./pages/debriefly/Home.jsx";
import DebrieflyPrivacy from "./pages/debriefly/Privacy.jsx";
import DebrieflySupport from "./pages/debriefly/Support.jsx";
import DebrieflyTerms from "./pages/debriefly/Terms.jsx";
import SlumbrHome from "./pages/slumbr/Home.jsx";
import SlumbrPrivacy from "./pages/slumbr/Privacy.jsx";
import SlumbrSupport from "./pages/slumbr/Support.jsx";
import SouthsideHome from "./pages/southside/Home.jsx";
import SouthsidePrivacy from "./pages/southside/Privacy.jsx";
import SouthsideSupport from "./pages/southside/Support.jsx";
import SouthsideWalkthrough from "./pages/southside/Walkthrough.jsx";
import MancaveHome from "./pages/mancave-displays/Home.jsx";
import MancavePrivacy from "./pages/mancave-displays/Privacy.jsx";
import MancaveSupport from "./pages/mancave-displays/Support.jsx";
import ReceiptHome from "./pages/receipt-tax-tracker/Home.jsx";
import ReceiptPrivacy from "./pages/receipt-tax-tracker/Privacy.jsx";
import ReceiptSupport from "./pages/receipt-tax-tracker/Support.jsx";
import LearnHome from "./pages/learn-and-play/Home.jsx";
import LearnPrivacy from "./pages/learn-and-play/Privacy.jsx";
import LearnSupport from "./pages/learn-and-play/Support.jsx";
import LearnTerms from "./pages/learn-and-play/Terms.jsx";
import TeslaDashboard from "./pages/tesla-dashboard/index.jsx";
import MothersDayGiftCard from "./pages/mothers-day-2026/index.jsx";
import FarkleTracker from "./pages/farkle/index.jsx";
import MyBets from "./pages/my-bets/index.jsx";
import TotalsValue from "./pages/totals-value/index.jsx";
import CryptoValue from "./pages/crypto-value/index.jsx";
import WeatherValue from "./pages/weather-value/index.jsx";
import MorningReview from "./pages/morning-review/index.jsx";
import GulfHurricane from "./pages/gulf-hurricane/index.jsx";
import TripPlannerHome from "./pages/trip-planner/index.jsx";
import TripPlanner from "./pages/trip-planner/Trip.jsx";
import EliteEdgeAdvisors from "./pages/elite-edge-advisors/index.jsx";
import ZargleHome from "./pages/zargle/Home.jsx";
import ZarglePrivacy from "./pages/zargle/Privacy.jsx";
import ZargleSupport from "./pages/zargle/Support.jsx";
import ZargleTerms from "./pages/zargle/Terms.jsx";
import Palladium2026Home from "./pages/palladium-2026/Home.jsx";
import Palladium2026Privacy from "./pages/palladium-2026/Privacy.jsx";
import Palladium2026Support from "./pages/palladium-2026/Support.jsx";
import WeddingPhotosHome from "./pages/wedding-photos/Home.jsx";
import WeddingPhotosPrivacy from "./pages/wedding-photos/Privacy.jsx";
import WeddingPhotosSupport from "./pages/wedding-photos/Support.jsx";
import DaycareMemoryVaultHome from "./pages/daycare-memory-vault/Home.jsx";
import DaycareMemoryVaultPrivacy from "./pages/daycare-memory-vault/Privacy.jsx";
import DaycareMemoryVaultSupport from "./pages/daycare-memory-vault/Support.jsx";
import Ashley from "./pages/ashley/index.jsx";
import Prospects from "./pages/prospects/index.jsx";
import PatrickBoard from "./pages/patrick/index.jsx";
import Hrw from "./pages/hrw/index.jsx";
import HrwRestaurant from "./pages/hrw/Restaurant.jsx";

export default function App() {
  const location = useLocation();
  const isTeslaDashboard = location.pathname.startsWith("/tesla-dashboard");
  const isMothersDay = location.pathname.startsWith("/mothers-day-2026");
  const isFarkle = location.pathname.startsWith("/farkle");
  const isMyBets = location.pathname.startsWith("/my-bets");
  const isTotalsValue =
    location.pathname.startsWith("/totals-value") ||
    location.pathname.startsWith("/wnba-value");
  const isCryptoValue = location.pathname.startsWith("/crypto-value");
  const isWeatherValue = location.pathname.startsWith("/weather-value");
  const isMorningReview = location.pathname.startsWith("/morning-review");
  const isEliteEdge = location.pathname.startsWith("/elite-edge-advisors");
  const isZargle = location.pathname.startsWith("/zargle");
  const isGulfHurricane = location.pathname.startsWith("/gulf-hurricane");
  const isTripPlanner = location.pathname.startsWith("/tripplanner");
  // Full-screen, and deliberately not linked from the home page or PrivateTools
  // — it's one person's client book, gated behind its own login.
  const isAshley = location.pathname.startsWith("/ashley");
  // Also full-screen and also unlisted — her Houston C&I calling list. Unlike
  // /ashley it has no login at all; see the header of src/pages/prospects/index.jsx.
  const isProspects = location.pathname.startsWith("/prospects");
  // Patrick's own project board — a wall of mini todo boards, one per app he is
  // still finishing. Full-screen because the whole point is seeing every board
  // at once; unlisted and unauthenticated like /prospects.
  const isPatrickBoard = location.pathname.startsWith("/patrick");
  const hideChrome =
    isTeslaDashboard ||
    isMothersDay ||
    isFarkle ||
    isZargle ||
    isMyBets ||
    isTotalsValue ||
    isCryptoValue ||
    isWeatherValue ||
    isMorningReview ||
    isEliteEdge ||
    isGulfHurricane ||
    isTripPlanner ||
    isAshley ||
    isProspects ||
    isPatrickBoard;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <ScrollToTop />
      {!hideChrome && <Navbar />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/debriefly" element={<DebrieflyHome />} />
          <Route path="/debriefly/privacy" element={<DebrieflyPrivacy />} />
          <Route path="/debriefly/support" element={<DebrieflySupport />} />
          <Route path="/debriefly/terms" element={<DebrieflyTerms />} />
          <Route path="/slumbr" element={<SlumbrHome />} />
          <Route path="/slumbr/privacy" element={<SlumbrPrivacy />} />
          <Route path="/slumbr/support" element={<SlumbrSupport />} />
          <Route path="/southside" element={<SouthsideHome />} />
          {/* App Store Connect's Marketing URL field was filled in as
              /southside/marketing, so that path has to resolve to the landing
              page too — the listing is live with it. */}
          <Route path="/southside/marketing" element={<SouthsideHome />} />
          <Route path="/southside/privacy" element={<SouthsidePrivacy />} />
          <Route path="/southside/support" element={<SouthsideSupport />} />
          <Route
            path="/southside/walkthrough"
            element={<SouthsideWalkthrough />}
          />
          {/* "tour" is the word people guess for this — same page. */}
          <Route path="/southside/tour" element={<SouthsideWalkthrough />} />
          <Route path="/mancave-displays" element={<MancaveHome />} />
          <Route
            path="/mancave-displays/privacy"
            element={<MancavePrivacy />}
          />
          <Route
            path="/mancave-displays/support"
            element={<MancaveSupport />}
          />
          <Route path="/receipt-tax-tracker" element={<ReceiptHome />} />
          <Route
            path="/receipt-tax-tracker/privacy"
            element={<ReceiptPrivacy />}
          />
          <Route
            path="/receipt-tax-tracker/support"
            element={<ReceiptSupport />}
          />
          <Route path="/learn-and-play" element={<LearnHome />} />
          <Route path="/learn-and-play/privacy" element={<LearnPrivacy />} />
          <Route path="/learn-and-play/support" element={<LearnSupport />} />
          <Route path="/learn-and-play/terms" element={<LearnTerms />} />
          <Route path="/tesla-dashboard" element={<TeslaDashboard />} />
          <Route path="/mothers-day-2026" element={<MothersDayGiftCard />} />
          <Route path="/farkle" element={<FarkleTracker />} />
          <Route path="/my-bets" element={<MyBets />} />
          <Route path="/totals-value" element={<TotalsValue />} />
          <Route path="/crypto-value" element={<CryptoValue />} />
          <Route path="/weather-value" element={<WeatherValue />} />
          <Route path="/morning-review" element={<MorningReview />} />
          <Route path="/gulf-hurricane" element={<GulfHurricane />} />
          <Route path="/tripplanner" element={<TripPlannerHome />} />
          <Route path="/tripplanner/:slug" element={<TripPlanner />} />
          <Route path="/ashley" element={<Ashley />} />
          {/* Both render the same component — it shows one company when there is
              a slug, so /prospects/quanta-services is bookmarkable. */}
          <Route path="/prospects" element={<Prospects />} />
          <Route path="/prospects/:slug" element={<Prospects />} />
          {/* Cardless and unlisted on purpose — reached by typing the URL. */}
          <Route path="/patrick" element={<PatrickBoard />} />
          <Route path="/hrw" element={<Hrw />} />
          <Route path="/hrw/:slug" element={<HrwRestaurant />} />
          <Route
            path="/wnba-value"
            element={<Navigate to="/totals-value" replace />}
          />
          <Route path="/elite-edge-advisors" element={<EliteEdgeAdvisors />} />
          <Route path="/zargle" element={<ZargleHome />} />
          <Route path="/zargle/privacy" element={<ZarglePrivacy />} />
          <Route path="/zargle/support" element={<ZargleSupport />} />
          <Route path="/zargle/terms" element={<ZargleTerms />} />
          <Route path="/palladium-2026" element={<Palladium2026Home />} />
          <Route
            path="/palladium-2026/privacy"
            element={<Palladium2026Privacy />}
          />
          <Route
            path="/palladium-2026/support"
            element={<Palladium2026Support />}
          />
          <Route path="/wedding-photos" element={<WeddingPhotosHome />} />
          <Route
            path="/wedding-photos/privacy"
            element={<WeddingPhotosPrivacy />}
          />
          <Route
            path="/wedding-photos/support"
            element={<WeddingPhotosSupport />}
          />
          <Route
            path="/daycare-memory-vault"
            element={<DaycareMemoryVaultHome />}
          />
          <Route
            path="/daycare-memory-vault/privacy"
            element={<DaycareMemoryVaultPrivacy />}
          />
          <Route
            path="/daycare-memory-vault/support"
            element={<DaycareMemoryVaultSupport />}
          />
        </Routes>
      </div>
      {!hideChrome && <Footer />}
    </div>
  );
}
