import { Link } from "react-router-dom";

/* Walkthrough for the FF Draft War Room (/ffdraft). Screenshots live in
 * public/ffdraft-guide/ and were captured from the real page — the mid-draft
 * ones from a staged round-3 state (marks were reset afterward). */

const C = {
  bg: "#0b0e14",
  panel: "#151a24",
  panel2: "#101520",
  border: "#252c3a",
  text: "#e8eaed",
  muted: "#8a93a6",
  green: "#22c55e",
  amber: "#eab308",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a78bfa",
  chipBg: "#1c2430",
};

function Shot({ src, alt, caption }) {
  return (
    <figure style={{ margin: "14px 0" }}>
      <img
        src={`/ffdraft-guide/${src}`}
        alt={alt}
        style={{
          width: "100%",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          display: "block",
        }}
      />
      {caption && (
        <figcaption style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ margin: "34px 0" }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          margin: "0 0 10px",
          color: C.text,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }) {
  return (
    <p style={{ lineHeight: 1.65, margin: "10px 0", color: C.text }}>
      {children}
    </p>
  );
}

function Term({ name, children }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "8px 0",
        borderBottom: `1px solid ${C.border}`,
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      <div style={{ flex: "0 0 130px", fontWeight: 700 }}>{name}</div>
      <div style={{ color: C.muted }}>{children}</div>
    </div>
  );
}

function Chip({ color, children }) {
  return (
    <span
      style={{
        background: C.chipBg,
        color,
        border: `1px solid ${C.border}`,
        borderRadius: 999,
        padding: "1px 9px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export default function FFDraftGuide() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "20px 16px 80px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link
          to="/ffdraft"
          style={{ color: C.blue, fontSize: 13, textDecoration: "none" }}
        >
          ← back to the war room
        </Link>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "10px 0 4px" }}>
          🏈 Draft War Room — the manual
        </h1>
        <p style={{ color: C.muted, margin: 0 }}>
          Everything on the board, what it means, and how to use it to win the
          draft.
        </p>

        <Section title="The 30-second loop (this is the whole system)">
          <P>
            At every one of your picks, three glances in order:
          </P>
          <P>
            <b>1. Who</b> — the ⭐ top suggestion card. It already accounts
            for value, your roster, tier cliffs, byes, and who can actually
            reach your next pick.
            <br />
            <b>2. Why</b> — the small gray reasons under the name. If they
            don&apos;t convince you, look at #2–#5.
            <br />
            <b>3. Can it wait</b> — the COST OF WAITING strip. A red number at
            a position means the drop-off before your next turn is steep: take
            that position <i>now</i>. Small numbers mean you can wait a round
            and take value elsewhere.
          </P>
          <P>
            Everything else on the page exists to feed those three glances.
          </P>
        </Section>

        <Section title="Draft night, step by step">
          <P>
            <b>1.</b> Make your actual picks in <b>ESPN&apos;s draft room</b> —
            this page is your second screen (laptop, second monitor, or
            phone).
            <br />
            <b>2.</b> Open this page a few minutes before 7:00 PM.
            <br />
            <b>3.</b> Watch the <b>“X/160 picked”</b> counter for the first
            few real picks. If it ticks up on its own, live sync is working —
            you never touch anything. If it stays at 0, you&apos;re in manual
            mode: tap <Chip color={C.muted}>gone</Chip> on each pick as it
            happens and <Chip color={C.green}>mine</Chip> on your own. Marks
            save to the server, so every device you open stays in sync.
            <br />
            <b>4.</b> Rankings refresh themselves — the board pulls fresh
            expert consensus and ADP on load and every 15 minutes, so
            same-day injury news is already priced in.
          </P>
        </Section>

        <Section title="The header">
          <Shot
            src="g_header.png"
            alt="Header with status pill and practice button"
          />
          <Term name="Status pill">
            <Chip color={C.amber}>● PRE-DRAFT</Chip> before ESPN opens the
            room · <Chip color={C.green}>● LIVE — SYNCED</Chip> picks are
            flowing in automatically ·{" "}
            <Chip color={C.red}>● SYNC ERROR — MANUAL MODE</Chip> use the
            gone/mine buttons · <Chip color={C.purple}>● PRACTICE MODE</Chip>{" "}
            you&apos;re in the simulator ·{" "}
            <Chip color={C.amber}>⚠ SNAPSHOT BOARD</Chip> a ranking source was
            unreachable, so this is the last good board from the database
            (live pick sync is unaffected).
          </Term>
          <Term name="🎮 practice draft">
            Runs the entire draft against bots that pick like real drafters
            (ADP with human randomness, no kickers, defenses late). You pick
            with one click per round in this exact interface. Nothing is
            saved — exit any time. Best prep there is.
          </Term>
          <Term name="show drafted">
            Reveals drafted players struck-through, with who took them, and an
            undo button for manual marks. A red “reset manual marks” button
            appears here too — it wipes every manual mark on every device
            (use it to clean up after experimenting, never mid-draft).
          </Term>
        </Section>

        <Section title="The pick tracker">
          <Shot
            src="g_banner_pre.png"
            alt="Pre-draft pick tracker"
            caption="Before the draft: pick counter, your next two picks, and sync time."
          />
          <Shot
            src="g_clock.png"
            alt="On the clock banner"
            caption="When it's your turn the banner goes green. “then #34” is your following pick — that's the pick the availability math is aimed at."
          />
          <P>
            You pick 7th, so your picks are{" "}
            <b>#7, #14, #27, #34, #47, #54, #67, #74…</b> — the tracker always
            shows how many picks until your turn and which pick number comes
            after it. Two more lines appear here when the live feed is on:
            a <b style={{ color: C.red }}>🔥 position-run alert</b> when 4+ of
            the last 8 picks hit one position, and a{" "}
            <b>“before your pick: 3 teams need RB…”</b> line showing what the
            specific teams drafting between now and your turn still
            haven&apos;t filled — that predicts what disappears better than
            ADP does.
          </P>
        </Section>

        <Section title="Cost of waiting — the tiebreaker">
          <Shot src="g_cost.png" alt="Cost of waiting strip" />
          <P>
            The single most useful number on the page. For each position it
            compares the <b>best player available right now</b> against the{" "}
            <b>best player likely to survive to your following pick</b>, in
            projected points for this league&apos;s scoring. In the shot
            above: waiting on RB costs 57 points, waiting on TE costs 5. So
            even if a wide receiver is “ranked higher,” the RB is the pick —
            the WR you&apos;d want will have an equivalent replacement later;
            the RB won&apos;t.{" "}
            <b style={{ color: C.red }}>Red = take it now</b>,{" "}
            <span style={{ color: C.amber }}>amber = getting risky</span>,
            gray = safe to wait. Most leagues draft “best name available.”
            You&apos;ll be drafting “biggest loss avoided.” That&apos;s the
            edge.
          </P>
        </Section>

        <Section title="Suggestion cards">
          <Shot
            src="g_suggestions.png"
            alt="Suggestion cards"
            caption="Mid-draft example: Jonathan Taylor fell 20 picks past his ADP — the board caught it and made him the top suggestion with the reasons spelled out."
          />
          <P>
            The top five picks <i>for your team specifically</i>, rescored
            after every single pick in the league. The score blends: points
            over a replacement player at that position (in your exact
            scoring), how badly your roster needs the position, tier
            scarcity, falling value, bye-week conflicts, and — between your
            turns — the odds the player actually reaches you. The gray reasons
            are the explanation, in plain words:
          </P>
          <Term name="starting X open">
            You still have an empty starting slot at this position — full
            urgency.
          </Term>
          <Term name="flex value">
            Starters are filled but this player would start in your FLEX.
          </Term>
          <Term name="only N left in tier X">
            The tier is nearly empty. Miss it and the next tier down is a real
            step off. This is the alarm that wins drafts.
          </Term>
          <Term name="falling — N past ADP">
            The room forgot him. Real mock-draft data says he should be gone;
            he isn&apos;t. Free money.
          </Term>
          <Term name="only N% chance they reach you">
            If you don&apos;t take him now, he&apos;s probably gone before
            your next turn.
          </Term>
          <Term name="⚠ bye N stack">
            You already roster multiple players on this bye — drafting him
            risks punting a whole week.
          </Term>
          <Term name="sources split — upside play">
            The four ranking sources disagree hard on him. Late in the draft
            that&apos;s a feature: benches are for lottery tickets, and from
            round 11 on the board deliberately favors these.
          </Term>
        </Section>

        <Section title="Reading the board">
          <Shot
            src="g_table.png"
            alt="The player table with badges"
            caption="Note Jonathan Taylor's ▼ VALUE badge and 0% AVAIL@NEXT (take him or lose him), and Tee Higgins' BYE⚠ (two bye-6 players already rostered)."
          />
          <Term name="RK">
            Overall rank by the blended consensus of all four sources.
          </Term>
          <Term name="TIER">
            FantasyPros expert tier. A ⚠ means only 1–2 players are left in
            that tier at that position — tier cliff.
          </Term>
          <Term name="CONS">
            Consensus rank — the average of the four signals below. The board
            sorts by this.
          </Term>
          <Term name="FPROS">
            FantasyPros Expert Consensus Rank (100+ experts, PPR).
          </Term>
          <Term name="ADP">
            Average draft position from real 10-team PPR mock drafts
            (FantasyFootballCalculator) — what actual humans do, not what
            experts say.
          </Term>
          <Term name="ESPN">
            ESPN&apos;s own PPR rank — useful precisely because your league
            mates are drafting off it.
          </Term>
          <Term name="PROJ">
            ESPN&apos;s 2026 season projection computed in{" "}
            <i>this league&apos;s exact scoring</i> (PPR, 4-pt pass TD, no
            kickers).
          </Term>
          <Term name="VORP">
            Value Over Replacement Player — projected points above the best
            player you could get for free at that position (green = big).
            This is why a mid-tier TE can be worth more than a higher-ranked
            WR: the cliff behind him is steeper.
          </Term>
          <Term name="AVAIL@NEXT">
            The chance the player is still on the board at your next pick,
            from real ADP spreads.{" "}
            <span style={{ color: C.green }}>Green</span> = safe to wait,{" "}
            <span style={{ color: C.amber }}>amber</span> = coin flip,{" "}
            <span style={{ color: C.red }}>red</span> = now or never.
          </Term>
          <Term name="▼ VALUE">
            Still on the board 8+ picks past his real ADP. The room is
            napping.
          </Term>
          <Term name="BYE⚠">
            You already roster 2+ players on this player&apos;s bye week.
          </Term>
          <Term name="QUESTIONABLE / OUT">
            ESPN&apos;s current injury designation, straight from their feed.
          </Term>
          <Term name="gone / mine">
            Manual fallback. <Chip color={C.muted}>gone</Chip> = someone else
            drafted him, <Chip color={C.green}>mine</Chip> = you did. Saved to
            the server instantly and synced to every open device. If live sync
            is working you&apos;ll never need these.
          </Term>
        </Section>

        <Section title="The right rail">
          <Shot
            src="g_rail.png"
            alt="My roster and draft plan panels"
            caption="Round 3 of a staged draft: roster filling up, and a concrete plan for picks #27, #34, #47, #54."
          />
          <Term name="My Roster">
            Fills as your picks come in (live or manual), slotted into
            starters → flex → bench. Byes shown so stacking is visible at a
            glance.
          </Term>
          <Term name="Draft Plan">
            Your next four picks, scripted: for each one, the top players
            with at least a 50% chance of still being there, ranked by value
            × your need. It re-plans after every pick in the league — when a
            run wrecks Plan A, Plan B is already written. Use it between
            turns to decide what you&apos;re <i>actually</i> waiting on.
          </Term>
          <Term name="League Rosters">
            Every team&apos;s positional counts (2R 1W 1Q…), in draft order.
            Appears once live picks exist. Glance at it to see who&apos;s
            hoarding RBs and who still needs a QB before your turn.
          </Term>
          <Term name="Recent Picks">
            The last eight picks with who took them — your radar for runs
            starting.
          </Term>
        </Section>

        <Section title="Under the hood">
          <P>
            The consensus blends <b>FantasyPros ECR</b> (what 100+ experts
            think), <b>FantasyFootballCalculator ADP</b> (what real drafters
            in 10-team PPR mocks actually do), <b>ESPN&apos;s rank, ADP and
            projections</b> (what your league mates are looking at), and{" "}
            <b>Boris Chen&apos;s tiers</b> (clustering math on expert ranks).
            Live picks come from ESPN&apos;s draft feed for this league,
            polled every 5 seconds. Manual marks and a snapshot of the last
            good board live in a database, so a mid-draft hiccup in any
            single source can&apos;t take the tool down — worst case you see
            the ⚠ SNAPSHOT BOARD chip and keep drafting.
          </P>
          <P style={{ color: C.muted }}>
            League specifics baked into the math: 10-team snake, you pick
            7th, starters are 1 QB · 2 RB · 2 WR · 1 TE · 2 FLEX · 1 D/ST,{" "}
            <b>no kickers exist</b> (the tool will never suggest one), and
            D/ST is suppressed until round 12 because in a 10-team league
            replacement defenses are free on waivers.
          </P>
        </Section>

        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.green}`,
            borderRadius: 12,
            padding: "16px 20px",
            marginTop: 30,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            The one-line version
          </div>
          <div style={{ color: C.muted, lineHeight: 1.6 }}>
            Take the ⭐ suggestion unless the reasons don&apos;t convince you,
            let the red numbers on the cost strip break every tie, trust tier
            ⚠ warnings over big names, and grab anything with a ▼ VALUE badge
            that fits your roster. Everything else is noise.
          </div>
          <div style={{ marginTop: 14 }}>
            <Link
              to="/ffdraft"
              style={{
                color: "#fff",
                background: C.blue,
                padding: "8px 18px",
                borderRadius: 8,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              → to the war room
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
