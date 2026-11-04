/**
 * Hand-made 8×8 pixel icons. Each icon is a little text picture:
 * every character is one pixel, "." is see-through, and other letters pick a
 * colour from PALETTE. They are drawn as SVG squares, so they stay crisp at any size.
 */
import type { ReactElement } from 'react';

const PALETTE: Record<string, string> = {
  k: '#2b1d0e', // outline
  y: '#ffd93b', // gold
  o: '#f0a020', // orange
  r: '#d64541', // red
  g: '#5fa83b', // green
  G: '#3f7a26', // dark green
  b: '#4aa3df', // blue
  B: '#2a6fa8', // dark blue
  l: '#9fdcff', // light blue
  w: '#ffffff',
  s: '#a8a8a8', // stone
  S: '#6b6b6b', // dark stone
  n: '#b07a3e', // wood
  N: '#6e4522', // dark wood
  p: '#f0d9a8', // paper
  f: '#ffd93b', // face colour (can be swapped, see `fill` prop)
};

const ICONS = {
  coin: ['..kkkk..', '.kyyyok.', 'kywyyyok', 'kywyyyok', 'kyyyyyok', 'kyyyyook', '.kooook.', '..kkkk..'],
  heart: ['.kk.kk..', 'krwkrrk.', 'krrrrrk.', 'krrrrrk.', '.krrrk..', '..krk...', '...k....', '........'],
  book: ['.kkkkkk.', 'kBbbbbbk', 'kBbwwbbk', 'kBbbbbbk', 'kBbwwbbk', 'kBbbbbbk', 'kBkkkkkk', 'kkppppp.'],
  clock: ['..kkkk..', '.kwwwwk.', 'kwwkwwwk', 'kwwkwwwk', 'kwwkkkwk', 'kwwwwwwk', '.kwwwwk.', '..kkkk..'],
  chest: ['.kkkkkk.', 'knnnnnnk', 'kNNNNNNk', 'kkkyykkk', 'knnyynnk', 'knnnnnnk', 'kNNNNNNk', 'kkkkkkkk'],
  house: ['...kk...', '..krrk..', '.krrrrk.', 'krrrrrrk', '.kppppk.', '.kpnnpk.', '.kpnnpk.', '.kkkkkk.'],
  apple: ['....G...', '...Gg...', '.krrkrk.', 'krwrrrrk', 'krwrrrrk', 'krrrrrrk', '.krrrrk.', '..kkkk..'],
  bus: ['.kkkkkk.', 'kbbbbbbk', 'kbllllbk', 'kbllllbk', 'kbbbbbbk', 'kyybbyyk', 'kkkkkkkk', '.kk..kk.'],
  phone: ['..kkkk..', '..kllk..', '..kllk..', '..kllk..', '..kllk..', '..kkkk..', '..kssk..', '..kkkk..'],
  star: ['...kk...', '..kyyk..', 'kkkyykkk', 'kyyyyyyk', '.kyyyyk.', '.kyykyyk', 'kyyk.kyk', 'kkk...kk'],
  box: ['kkkkkkkk', 'knnNNnnk', 'knnNNnnk', 'kkkkkkkk', 'knnnnnnk', 'knnnnnnk', 'knnnnnnk', 'kkkkkkkk'],
  flame: ['...o....', '...oo...', '..oyo...', '.oyyoo..', '.oywyo..', 'oyywyyo.', 'oyyyyyo.', '.oooooo.'],
  moon: ['..yyy...', '.yyy....', 'yyy.....', 'yyy.....', 'yyy.....', 'yyyy...y', '.yyyyyy.', '..yyyy..'],
  sun: ['o..o..o.', '.o.o.o..', '..yyy...', 'ooyyyoo.', '..yyy...', '.o.o.o..', 'o..o..o.', '........'],
  sound: ['...k....', '..kk..k.', 'kkwk.k.k', 'kwwk.k.k', 'kwwk.k.k', 'kkwk.k.k', '..kk..k.', '...k....'],
  mute: ['...k....', '..kk....', 'kkwkr.r.', 'kwwk.r..', 'kwwkr.r.', 'kkwk....', '..kk....', '...k....'],
  scroll: ['.kkkkkk.', 'kpppppkk', '.kpNNpk.', '.kppppk.', '.kpNNpk.', '.kppppk.', 'kkpppppk', '.kkkkkk.'],
  calendar: ['kkkkkkkk', 'krrrrrrk', 'kkkkkkkk', 'kwwwwwwk', 'kwrwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kkkkkkkk'],
  check: ['........', '.......g', '......gg', 'g....gg.', 'gg..gg..', '.gggg...', '..gg....', '........'],
  plus: ['..kkkk..', '..kwwk..', 'kkkwwkkk', 'kwwwwwwk', 'kwwwwwwk', 'kkkwwkkk', '..kwwk..', '..kkkk..'],
  trash: ['..kkkk..', 'kkkkkkkk', '.kssssk.', '.kSsSsk.', '.kSsSsk.', '.kSsSsk.', '.kssssk.', '.kkkkkk.'],
  pencil: ['......kk', '.....kyk', '....kyk.', '...kyk..', '..kyk...', '.kpk....', 'kpk.....', 'kk......'],
  table: ['kkkkkkkk', 'kpnpnpnk', 'knpnpnpk', 'kkkkkkkk', '.kN..Nk.', '.kN..Nk.', '.kN..Nk.', '.kk..kk.'],
  shelf: ['kkkkkkkk', 'krbgyrbk', 'krbgyrbk', 'kkkkkkkk', 'kgyrbgyk', 'kgyrbgyk', 'kkkkkkkk', 'kN....Nk'],
  cross: ['r......r', '.r....r.', '..r..r..', '...rr...', '...rr...', '..r..r..', '.r....r.', 'r......r'],
  card: ['.kkkkkk.', 'kwwwwwwk', 'kwbbbbwk', 'kwwwwwwk', 'kwbbwwwk', 'kwwwwwwk', 'kwwwwwwk', '.kkkkkk.'],
  gear: ['...ss...', '.s.ss.s.', '..ssss..', 'sssSSsss', 'sssSSsss', '..ssss..', '.s.ss.s.', '...ss...'],
  arrowL: ['........', '...k....', '..kk....', '.kkkkkk.', '.kkkkkk.', '..kk....', '...k....', '........'],
  arrowR: ['........', '....k...', '....kk..', '.kkkkkk.', '.kkkkkk.', '....kk..', '....k...', '........'],
  telescope: ['......yk', '.....kBk', '....kBk.', '...kBk..', '..kkk...', '..kNk...', '.kN.Nk..', 'kN...Nk.'],
  letter: ['........', 'kkkkkkkk', 'kkppppkk', 'kpkppkpk', 'kppkkppk', 'kpprrppk', 'kkkkkkkk', '........'],
  globe: ['..kkkk..', '.kbgbbk.', 'kbggbbbk', 'kbbgggbk', 'kbbbggbk', 'kgbbbgbk', '.kbbbbk.', '..kkkk..'],
  // Faces for the mood check-in (great → awful)
  face5: ['.kkkkkk.', 'kffffffk', 'kfkffkfk', 'kffffffk', 'kkffffkk', 'kfkkkkfk', 'kffffffk', '.kkkkkk.'],
  face4: ['.kkkkkk.', 'kffffffk', 'kfkffkfk', 'kffffffk', 'kfkffkfk', 'kffkkffk', 'kffffffk', '.kkkkkk.'],
  face3: ['.kkkkkk.', 'kffffffk', 'kfkffkfk', 'kffffffk', 'kffffffk', 'kfkkkkfk', 'kffffffk', '.kkkkkk.'],
  face2: ['.kkkkkk.', 'kffffffk', 'kfkffkfk', 'kffffffk', 'kffkkffk', 'kfkffkfk', 'kffffffk', '.kkkkkk.'],
  face1: ['.kkkkkk.', 'kffffffk', 'kkkffkkk', 'kfkffkfk', 'kfkkkkfk', 'kkffffkk', 'kffffffk', '.kkkkkk.'],
} as const;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: number;
  /** If set, the icon is announced to screen readers; otherwise it's decoration. */
  title?: string;
  /** Override the "f" colour (used to tint mood faces). */
  fill?: string;
  className?: string;
}

export function PixelIcon({ name, size = 24, title, fill, className }: Props) {
  const rects: ReactElement[] = [];
  ICONS[name].forEach((row, y) => {
    // Merge runs of the same colour in a row into one wide rectangle (fewer SVG elements).
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (row[x + w] === ch) w++;
      if (ch !== '.') {
        const color = ch === 'f' && fill ? fill : PALETTE[ch];
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={color} />);
      }
      x += w;
    }
  });
  return (
    <svg
      className={`picon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {rects}
    </svg>
  );
}
