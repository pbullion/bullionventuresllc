import { useMemo, useState } from "react";
import { Chip, Heading, Text } from "../components";
import { useMeasuredSize } from "../hooks";
import { formatCentral } from "../format";
import { T, W, alpha } from "../theme";
import { HOUSTON_LAT, HOUSTON_LON } from "../models/tracks";
import { radarTileUrl } from "../models/radar";
import {
  CONE,
  DRAW,
  HOUSTON_PIN,
  areaColor,
  basemapTileUrl,
  projectionFor,
  px,
  py,
  stormColor,
  tilesFor,
} from "./radarMap";

/* THE RADAR SCREEN — a port of whiparound-firetv's ui/RadarMap.kt. Rain, the
 * cone, and Houston, on one picture.
 *
 * The SECOND tropics screen, and deliberately not a better version of the
 * first: Tropics answers "what is it and how hard is it blowing" in words; this
 * answers "is it pointed at us, and has the rain got here yet", which only a
 * shape on a map says honestly.
 *
 * IT KEEPS ANSWERING Tropics.kt's OBJECTION TO PICTURES (NHC's cone graphic was
 * rejected because its labels fall far under the 34 floor). So the basemap is
 * drawn at DOUBLE tile size, the cone is a filled shape, the track is a thick
 * dashed line, Houston is a labelled dot, and there are NO city names, NO day
 * markers and NO legend. Adding a small label here re-opens a settled argument.
 * The one word under 34 is the 26pt tile credit, which nothing reads at a glance.
 *
 * A STATIC MAP. One radar frame (never a loop), absolutely positioned <img>
 * tiles, an SVG overlay. It is gated on its own data (tracks.any), not on the
 * tropics screen, and is never mocked: inventing a hurricane's position over
 * real rain is the one preview this board must not offer.
 */

/// 0.85: the radar has to dominate — it is what the screen is for — while the
/// coastline under it stays readable enough to place the rain against.
const RADAR_ALPHA = 0.85;

const SCRIM = alpha(T.bg, 0.72);

export function RadarScreen({ tracks, radar }) {
  const [ref, size] = useMeasuredSize();
  const lead = tracks.tracks[0] ?? null;

  return (
    <div
      style={{
        flex: "1 1 0",
        minHeight: 0,
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        background: T.bg,
      }}
    >
      <div ref={ref} style={{ position: "absolute", inset: 0 }}>
        {size && <RadarMap tracks={tracks} frame={radar} w={size.width} h={size.height} />}
      </div>

      {/* The corners. Deliberately sparse — Tropics carries the winds, pressure,
          heading and advisory; repeated here they would cover the map. What is
          here is what the picture cannot say: which system this is. */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          maxWidth: "calc(100% - 28px)",
          // A scrim, because there is no telling what is under it: black water
          // on a quiet day, a red core on the day the screen matters most.
          background: SCRIM,
          borderRadius: 14,
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Heading text="RADAR & TRACK" style={{ flexShrink: 0 }} />
          {lead?.inGulf && <Chip text="IN THE GULF" color={T.text} fill={T.hot} size={28} />}
        </div>
        {lead && (
          <Text size={72} weight={W.black} lines={1}>
            {(lead.name ?? "UNNAMED").toUpperCase()}
          </Text>
        )}
        {lead?.windMph != null && (
          <Text
            size={44}
            weight={W.black}
            color={lead.category != null ? T.hot : T.text}
            style={{ whiteSpace: "nowrap" }}
          >
            {`${lead.windMph} MPH`}
          </Text>
        )}
      </div>

      {/* THE TIMESTAMP IS NOT DECORATION. Radar with no clock on it cannot be
          told from radar that stopped updating an hour ago, and this board runs
          unattended. A missing frame says so rather than looking like a clear
          afternoon. */}
      <Corner bottom={14} left={14}>
        <Text
          size={34}
          weight={W.black}
          color={radar ? T.muted : T.amber}
          style={{ whiteSpace: "nowrap" }}
        >
          {radar ? `RAIN AT ${formatCentral(radar.time * 1000, "h:mm a")}` : "RADAR UNAVAILABLE"}
        </Text>
      </Corner>
      {/* 26pt: the documented exception to the floor — a licence credit, not
          something the room reads. */}
      <Corner bottom={14} right={14}>
        <Text size={26} weight={W.bold} color={T.muted} style={{ whiteSpace: "nowrap" }}>
          ESRI · RAINVIEWER · NOAA/NHC
        </Text>
      </Corner>
    </div>
  );
}

function Corner({ children, ...at }) {
  return (
    <div
      style={{
        position: "absolute",
        ...at,
        background: SCRIM,
        borderRadius: 12,
        padding: "9px 14px",
      }}
    >
      {children}
    </div>
  );
}

/* The tiles, the shapes and Houston's label. Remounted (by key) whenever the
 * framing or the radar frame changes, which is the Kotlin's
 * `remember(projection, frame?.time)` — a recomposition must not re-project,
 * and a new advisory or frame must start its load bookkeeping clean. */
function RadarMap({ tracks, frame, w, h }) {
  const projection = useMemo(() => projectionFor(tracks, w, h), [tracks, w, h]);
  const key = `${projection.zoom}:${projection.originX}:${projection.originY}:${w}x${h}:${frame?.time ?? "none"}`;
  return <MapLayers key={key} tracks={tracks} frame={frame} projection={projection} w={w} h={h} />;
}

function MapLayers({ tracks, frame, projection: p, w, h }) {
  const tiles = useMemo(() => tilesFor(p, w, h), [p, w, h]);
  const baseUrls = tiles.map((t) => basemapTileUrl(p.zoom, t.x, t.y));
  const rainUrls = frame ? tiles.map((t) => radarTileUrl(frame, p.zoom, t.x, t.y)) : [];

  /* url -> "ok" | "failed". NOTHING IS REMEMBERED ACROSS VISITS: the stick keeps
   * a 404 list, but an <img> cannot see a status code, and blacklisting on any
   * error is exactly the bug the stick fixed — a TIMEOUT IS NOT A 404, and one
   * dropped connection must not remove a piece of coastline for good. A failed
   * tile is simply asked for again next lap; the browser's HTTP cache is the
   * stick's LruCache for the ones that worked. */
  const [status, setStatus] = useState({});
  const mark = (url, v) => setStatus((s) => (s[url] ? s : { ...s, [url]: v }));

  const baseSettled = baseUrls.every((u) => status[u]);
  /* Basemap first, radar second, as two passes: the coastline is what makes
   * everything else placeable, so a slow connection should show a map with rain
   * arriving — never rain floating on black. */
  const rainStarted = frame != null && baseSettled;
  const settled = baseSettled && (!frame || rainUrls.every((u) => status[u]));
  const anyLoaded = Object.values(status).includes("ok");

  const hx = px(p, HOUSTON_LON);
  const hy = py(p, HOUSTON_LAT);

  return (
    <>
      {tiles.map((t, i) => (
        <Tile key={baseUrls[i]} url={baseUrls[i]} tile={t} status={status} mark={mark} />
      ))}
      {rainStarted &&
        tiles.map((t, i) => (
          <Tile
            key={rainUrls[i]}
            url={rainUrls[i]}
            tile={t}
            status={status}
            mark={mark}
            opacity={RADAR_ALPHA}
          />
        ))}

      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute", left: 0, top: 0, display: "block" }}
      >
        {/* Formation areas first, so a named storm's cone and track draw over. */}
        {tracks.areas.map((a, i) => (
          <AreaShape key={`a${i}`} area={a} p={p} />
        ))}
        {tracks.tracks.map((t, i) => (
          <TrackShape key={`t${t.id}:${i}`} track={t} p={p} />
        ))}
        {/* A dark ring under the dot so it survives heavy radar — exactly when
            it matters most. */}
        <circle cx={hx} cy={hy} r={17} fill={T.bg} />
        <circle cx={hx} cy={hy} r={12} fill={HOUSTON_PIN} />
      </svg>

      {/* An empty map has to say which kind of empty: two dozen tiles still in
          flight, or two dozen that failed. The shapes and Houston are drawn
          either way; what is missing is the coastline to place them against. */}
      {!anyLoaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            size={40}
            weight={W.black}
            color={settled ? T.amber : T.muted}
            style={{ whiteSpace: "nowrap" }}
          >
            {settled ? "MAP UNAVAILABLE" : "LOADING MAP…"}
          </Text>
        </div>
      )}

      {/* HOUSTON'S LABEL IS THE ONE PIECE OF TEXT PINNED TO THE MAP. Everything
          else sits in a corner, because text that moves with the geometry can
          land on the cone — but an unlabelled dot is no answer to "where are we". */}
      <Text
        size={36}
        weight={W.black}
        color={HOUSTON_PIN}
        style={{ position: "absolute", left: hx + 22, top: hy - 20, whiteSpace: "nowrap" }}
      >
        HOUSTON
      </Text>
    </>
  );
}

function Tile({ url, tile, status, mark, opacity = 1 }) {
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      decoding="async"
      onLoad={() => mark(url, "ok")}
      onError={() => mark(url, "failed")}
      style={{
        position: "absolute",
        left: tile.left,
        top: tile.top,
        // One px over, so neighbours overlap rather than leaving a seam — on a
        // dark basemap a seam is a visible grid across the whole screen.
        width: DRAW + 1,
        height: DRAW + 1,
        maxWidth: "none",
        opacity,
        // Hidden until it has actually arrived: a failed tile must be a gap,
        // never a broken-image glyph.
        visibility: status[url] === "ok" ? "visible" : "hidden",
        userSelect: "none",
      }}
    />
  );
}

function ringPath(points, p) {
  if (points.length < 3) return null;
  const d = points
    .map(([lat, lon], i) => `${i === 0 ? "M" : "L"}${px(p, lon).toFixed(1)} ${py(p, lat).toFixed(1)}`)
    .join("");
  return `${d}Z`;
}

function AreaShape({ area, p }) {
  const d = ringPath(area.polygon, p);
  if (!d) return null;
  const color = areaColor(area);
  return (
    <>
      <path d={d} fill={color} fillOpacity={0.2} stroke="none" />
      <path d={d} fill="none" stroke={color} strokeWidth={4} strokeDasharray="14 10" />
    </>
  );
}

function TrackShape({ track, p }) {
  const color = stormColor(track);
  const cone = ringPath(track.cone, p);
  const pts = track.forecast.map((f) => [px(p, f.lon), py(p, f.lat)]);
  const here = [px(p, track.lon), py(p, track.lat)];
  /* Sized by category, so a major hurricane reads bigger than a depression from
   * ten feet without comparing two numbers. */
  const r = 22 + (track.category ?? 0) * 7;
  return (
    <>
      {/* THE CONE IS DRAWN AS NHC DRAWS IT — white, translucent, unlabelled. In
          the storm's colour, a category 1 cone and a category 4 cone would read
          as different KINDS of thing instead of the same uncertainty. */}
      {cone && (
        <>
          <path d={cone} fill={CONE} fillOpacity={0.16} stroke="none" />
          <path d={cone} fill="none" stroke={CONE} strokeOpacity={0.7} strokeWidth={3} />
        </>
      )}
      {pts.length > 1 && (
        <polyline
          points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray="20 14"
        />
      )}
      {/* Forecast positions, UNLABELLED: the shape of the track is the
          information, and a number on every point is a chart nobody can read. */}
      {track.forecast.map((f, i) =>
        f.current ? null : (
          <g key={i}>
            <circle cx={pts[i][0]} cy={pts[i][1]} r={11} fill={T.bg} />
            <circle cx={pts[i][0]} cy={pts[i][1]} r={8} fill={color} />
          </g>
        ),
      )}
      {/* FOUR RINGS, and the outer two are not decoration: a depression is grey
          at the mouth of a near-white cone, so without the dark halo and the
          bright core WHERE IT IS was the hardest mark on the screen to find. */}
      <circle cx={here[0]} cy={here[1]} r={r + 5} fill={T.bg} fillOpacity={0.85} />
      <circle cx={here[0]} cy={here[1]} r={r} fill={color} fillOpacity={0.35} />
      <circle cx={here[0]} cy={here[1]} r={r} fill="none" stroke={color} strokeWidth={7} />
      <circle cx={here[0]} cy={here[1]} r={10} fill={T.text} />
    </>
  );
}
