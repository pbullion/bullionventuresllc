/* The basemap three pages here draw on.
 *
 * ESRI, NOT CARTO, and that is the whole reason this file exists. `cartocdn`
 * now serves its free tiles with "API KEY REQUIRED" printed across them **at
 * HTTP 200** — it fails by looking broken rather than by erroring, so nothing
 * in the code notices and the map just quietly reads as busted. (`src/pages/hrw/`
 * still uses CARTO and still shows the watermark.)
 *
 * NOTE THE PATH ORDER: Esri serves `{z}/{y}/{x}` — ROW BEFORE COLUMN, unlike
 * almost every other scheme. Getting it backwards returns tiles of the wrong
 * part of the world rather than a 404, which is a very slow thing to notice.
 *
 * Keyless, like everything else /drive and /gulf-hurricane depend on.
 */

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

export const BASEMAP_URL = `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
export const LABELS_URL = `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;
