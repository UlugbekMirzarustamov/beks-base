/** Tiny pixel-art sprites drawn as SVG that scale with their box (used by Rooms and the Dream room). */
import type { CSSProperties } from 'react';

export type Rows = string[];
export type Pal = Record<string, string>;

/** A pixel sprite that scales with its box (position and width set by the room layout). */
export function Sprite({ rows, pal, at, label }: { rows: Rows; pal: Pal; at: CSSProperties; label?: string }) {
  const w = Math.max(...rows.map((r) => r.length));
  return (
    <svg className="room__sprite" style={at} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {rows.flatMap((row, y) => [...row].map((ch, x) => (pal[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={pal[ch]} /> : null)))}
    </svg>
  );
}

