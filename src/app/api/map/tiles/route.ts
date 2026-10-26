import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { auth } from "@/auth";

// Serves the map's tile archive (one PMTiles file on this server) to signed-in users only. PMTiles reads the archive with
// HTTP Range requests, so only the bytes of the tiles on screen are sent. The file is not part of the image: it is mounted
// at MAP_TILES_FILE (see docs/map-tiles.md).
const FILE = process.env.MAP_TILES_FILE ?? "/data/map/tiles.pmtiles";
const MAX_RANGE_BYTES = 8 * 1024 * 1024;

const noStore = { "cache-control": "no-store" };

export async function GET(req: Request) {
  if (!(await auth())?.user?.id) return new Response("unauthorized", { status: 401, headers: noStore });

  let size: number;
  try {
    size = (await stat(FILE)).size;
  } catch {
    return new Response("map data not installed", { status: 404, headers: noStore });
  }

  const header = req.headers.get("range");
  if (!header) return new Response("range required", { status: 416, headers: { ...noStore, "content-range": `bytes */${size}` } });
  const m = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!m) return new Response("bad range", { status: 416, headers: { ...noStore, "content-range": `bytes */${size}` } });

  const start = Number(m[1]);
  const end = Math.min(m[2] === "" ? size - 1 : Number(m[2]), size - 1, start + MAX_RANGE_BYTES - 1);
  if (!(start <= end) || start >= size) return new Response("range not satisfiable", { status: 416, headers: { ...noStore, "content-range": `bytes */${size}` } });

  const body = Readable.toWeb(createReadStream(FILE, { start, end })) as unknown as ReadableStream;
  return new Response(body, {
    status: 206,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(end - start + 1),
      "content-range": `bytes ${start}-${end}/${size}`,
      "accept-ranges": "bytes",
      // The archive changes only when someone replaces the file; private so a shared cache never holds it for others.
      "cache-control": "private, max-age=3600",
    },
  });
}
