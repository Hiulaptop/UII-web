# Map data for the alert page

The alert page shows where the wearer was on a map drawn by MapLibre GL JS. The map data is **one file on this server**,
`tiles.pmtiles`, in the [PMTiles](https://docs.protomaps.com/pmtiles/) format. No third-party tile server is contacted:
the browser asks `/api/map/tiles`, which answers only signed-in users and sends just the byte ranges of the tiles on screen.

Without the file the page still works: the wearer's position is marked on an empty background and a note says that map
data is not installed.

## 1. Get the file (once, on any computer)

1. Install the `pmtiles` command line tool from <https://github.com/protomaps/go-pmtiles/releases>.
2. Pick a daily planet build from <https://maps.protomaps.com/builds/> (its file name is a date, for example
   `20260101.pmtiles`).
3. Cut out the area you need. Vietnam, down to street level:

   ```bash
   pmtiles extract https://build.protomaps.com/<DATE>.pmtiles tiles.pmtiles --bbox=102.1,8.4,109.5,23.4 --maxzoom=15
   ```

   `--bbox` is `west,south,east,north`. A smaller area or a lower `--maxzoom` gives a smaller file; the zoom the page
   needs for a street-level view is about 15. Check the size of the result before copying it.

The data is OpenStreetMap, shown with its credit in the map corner (© OpenStreetMap contributors).

## 2. Put it on the server

Copy the file to `./data/map/tiles.pmtiles` next to `docker-compose.yml` (or set `MAP_DATA_DIR` in `.env` to another
folder). Compose mounts that folder read-only at `/data/map`. No rebuild is needed to change the file, only a refresh of
the page; `MAP_TILES_FILE` can point somewhere else inside the container if you prefer.

```bash
docker compose up -d --build
```

## 3. Check

Sign in, open any alert that has a position, and the map should draw streets and water. In the browser's network panel,
`/api/map/tiles` answers `206 Partial Content`. A `404` means the file is not at the mounted path; a `401` means the
request carried no session.

## Notes

- The tile style is in `src/components/alerts/map-style.ts`. It has no text labels on purpose, because labels need font
  files; add them later by hosting glyphs on the same server.
- Replacing the file while the server runs is safe: each request reads the file fresh.
