/**
 * The living world behind every screen: a pixel sky that follows real Sheffield time
 * (sunrise, day, sunset, night), drifting clouds, birds, stars, rain or snow from the real
 * weather, and a little landscape at the bottom that changes with each section.
 * Purely decoration (aria-hidden); it sits behind everything and never catches taps.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { skyAt } from '../scene/Cabin';
import { useWeather, windowWeather } from './Weather';

export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';
type Scene = 'hills' | 'forest' | 'library' | 'town' | 'peaks' | 'mosque' | 'lake' | 'garden' | 'meadow';

/** Which landscape each section shows at the bottom of the sky. */
const SCENE_OF: Record<string, Scene> = {
  home: 'hills',
  money: 'forest',
  study: 'library',
  planner: 'town',
  reflect: 'peaks',
  prayer: 'mosque',
  calm: 'lake',
  pond: 'lake',
  kitchen: 'garden',
  rooms: 'hills',
  campfire: 'forest',
  archive: 'library',
  more: 'meadow',
};

/** Sky phase now, re-checked every minute. */
function useSkyPhase(): SkyPhase {
  const [phase, setPhase] = useState<SkyPhase>(() => skyAt(new Date()).phase);
  useEffect(() => {
    const t = window.setInterval(() => setPhase(skyAt(new Date()).phase), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return phase;
}

// Fixed star positions (x%, y%) so the sky looks the same each time.
const STARS = Array.from({ length: 34 }, (_, i) => {
  const r = (n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
  return { x: r(1) * 100, y: r(2) * 55, big: r(3) > 0.8, delay: r(4) * 4 };
});

/** `night` = the app is in night mode; a manual night mode in daylight shows a night sky. */
export function SkyWorld({ room, night }: { room: string; night: boolean }) {
  const real = useSkyPhase();
  const phase: SkyPhase = night && (real === 'day' || real === 'dawn') ? 'night' : real;
  const weather = windowWeather(useWeather());
  const wet = weather === 'rain' || weather === 'storm';
  const snow = weather === 'snow';
  const grey = wet || weather === 'cloudy' || weather === 'fog';
  const scene = SCENE_OF[room] ?? 'hills';
  const dark = phase === 'night';

  // The sun (or moon) rides an arc across the sky through the day (or night).
  const { hour, sunrise, sunset } = skyAt(new Date());
  const nightLen = (sunrise - sunset + 24) % 24 || 12;
  const t = dark ? ((hour - sunset + 24) % 24) / nightLen : (hour - sunrise) / (sunset - sunrise || 12);
  const along = Math.min(1, Math.max(0, t));
  const orbX = 8 + along * 78;
  const orbY = 32 - Math.sin(along * Math.PI) * 14; // vh: stays below the top bars

  return (
    <div className={`world world--${phase}${grey ? ' world--grey' : ''}`} aria-hidden="true">
      {dark && (
        <div className="world__stars">
          {STARS.map((s, i) => (
            <span key={i} className={s.big ? 'is-big' : ''} style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.delay}s` }} />
          ))}
        </div>
      )}
      {!grey && <span className={`world__orb ${dark ? 'world__orb--moon' : 'world__orb--sun'}`} style={{ left: `${orbX}%`, top: `${orbY}vh` }} />}
      <div className="world__clouds">
        <span className="cloud cloud--a" />
        <span className="cloud cloud--b" />
        <span className="cloud cloud--c" />
        {grey && <span className="cloud cloud--d" />}
      </div>
      {phase === 'day' && !wet && !snow && (
        <div className="world__birds">
          <span />
          <span />
          <span />
        </div>
      )}
      {(wet || snow) && <div className={`world__fall${snow ? ' world__fall--snow' : ''}`} />}
      <Land scene={scene} />
    </div>
  );
}

/** Pixel landscape strip (160×48 grid), coloured by CSS variables so it follows the sky. */
function Land({ scene }: { scene: Scene }) {
  return (
    <svg className="land" viewBox="0 0 160 48" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges">
      <path className="land__far" d="M0 30h12v-3h10v-4h14v3h12v-5h16v4h10v-3h18v5h14v-4h16v3h12v-2h16v26H0z" />
      <path className="land__near" d="M0 38h20v-2h24v2h18v-3h22v3h16v-2h26v2h34v10H0z" />
      {SCENES[scene]}
      <rect className="land__grass" x="0" y="44" width="160" height="4" />
    </svg>
  );
}

const pine = (x: number, y: number, k = 0) => (
  <g key={`p${x}-${k}`} className="land__tree">
    <rect x={x + 3} y={y - 4} width="2" height="4" className="land__trunk" />
    <rect x={x} y={y - 8} width="8" height="4" />
    <rect x={x + 1} y={y - 12} width="6" height="4" />
    <rect x={x + 2} y={y - 15} width="4" height="3" />
    <rect x={x + 3} y={y - 17} width="2" height="2" />
  </g>
);
const win = (x: number, y: number, w = 2, h = 2) => <rect key={`w${x}-${y}`} x={x} y={y} width={w} height={h} className="land__window" />;

const SCENES: Record<Scene, ReactElement> = {
  hills: (
    <g>
      {pine(6, 40)}
      {pine(16, 41, 1)}
      <rect x="64" y="32" width="22" height="10" className="land__wood" />
      <path d="M61 32l14-8 14 8z" className="land__roof" />
      <rect x="82" y="23" width="3" height="6" className="land__wood" />
      <rect x="82" y="19" width="2" height="2" className="land__smoke" />
      <rect x="84" y="15" width="2" height="2" className="land__smoke land__smoke--2" />
      {win(68, 35, 4, 3)}
      {win(78, 35, 4, 3)}
      <rect x="73" y="36" width="4" height="6" className="land__door" />
      {pine(130, 41, 2)}
      {pine(142, 40, 3)}
      {pine(150, 42, 4)}
    </g>
  ),
  forest: (
    <g>
      {[0, 10, 19, 30, 44, 56, 70, 90, 100, 110, 120, 133, 146, 154].map((x, i) => pine(x, 40 + (i % 3), i))}
      <rect x="76" y="38" width="10" height="6" className="land__wood" />
      <rect x="76" y="38" width="10" height="2" className="land__roof" />
      <rect x="80" y="39" width="2" height="2" className="land__gold" />
    </g>
  ),
  library: (
    <g>
      <rect x="48" y="20" width="64" height="24" className="land__stone" />
      <path d="M44 20l36-10 36 10z" className="land__roof" />
      {[52, 62, 72, 84, 94, 104].map((x) => (
        <rect key={x} x={x} y="24" width="3" height="20" className="land__pillar" />
      ))}
      {[56, 66, 88, 98].map((x) => win(x, 27, 3, 5))}
      <rect x="77" y="32" width="6" height="12" className="land__door" />
      {pine(8, 42)}
      {pine(22, 41, 1)}
      {pine(132, 41, 2)}
      {pine(146, 42, 3)}
    </g>
  ),
  town: (
    <g>
      {[
        [4, 30, 16],
        [22, 26, 14],
        [38, 32, 18],
        [90, 28, 16],
        [108, 33, 14],
        [124, 27, 18],
        [144, 31, 16],
      ].map(([x, y, w]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={44 - y} className="land__wood" />
          <path d={`M${x - 1} ${y}l${w / 2 + 1} -5 ${w / 2 + 1} 5z`} className="land__roof" />
          {win(x + 3, y + 4)}
          {win(x + w - 5, y + 4)}
          {win(x + 3, y + 9)}
        </g>
      ))}
      <rect x="62" y="12" width="14" height="32" className="land__stone" />
      <path d="M60 12l9-8 9 8z" className="land__roof" />
      <rect x="65" y="16" width="8" height="8" className="land__clock" />
      <rect x="68" y="17" width="2" height="4" className="land__edge" />
      <rect x="69" y="20" width="3" height="1" className="land__edge" />
      {win(67, 30, 4, 5)}
    </g>
  ),
  peaks: (
    <g>
      <path d="M0 38l18-18 10 8 18-22 20 24 12-10 22 18 16-14 22 14 22-12v22H0z" className="land__far" />
      <path d="M40 10l6-6 6 6-3-1-3 2-3-2z" className="land__snowcap" />
      <path d="M102 22l4-4 4 4-2-1-2 1z" className="land__snowcap" />
      <rect x="118" y="34" width="16" height="10" className="land__stone" />
      <path d="M118 34a8 8 0 0 1 16 0z" className="land__roof" />
      <rect x="128" y="25" width="2" height="7" className="land__edge" transform="rotate(35 129 30)" />
      {win(124, 37, 4, 3)}
      {pine(20, 42)}
      {pine(30, 41, 1)}
    </g>
  ),
  mosque: (
    <g>
      <rect x="50" y="28" width="60" height="16" className="land__stone" />
      <path d="M62 28a18 14 0 0 1 36 0z" className="land__roof" />
      <rect x="79" y="10" width="2" height="5" className="land__gold" />
      <path d="M52 28a6 6 0 0 1 12 0zM96 28a6 6 0 0 1 12 0z" className="land__roof" />
      <rect x="36" y="10" width="6" height="34" className="land__stone" />
      <path d="M35 10l4-6 4 6z" className="land__roof" />
      <rect x="118" y="10" width="6" height="34" className="land__stone" />
      <path d="M117 10l4-6 4 6z" className="land__roof" />
      {[58, 68, 88, 98].map((x) => win(x, 33, 3, 5))}
      <path d="M76 44v-7a4 4 0 0 1 8 0v7z" className="land__door" />
      {win(38, 16, 2, 3)}
      {win(120, 16, 2, 3)}
    </g>
  ),
  lake: (
    <g>
      <rect x="20" y="38" width="120" height="6" className="land__water" />
      <rect x="40" y="40" width="20" height="1" className="land__shine" />
      <rect x="90" y="39" width="26" height="1" className="land__shine" />
      {pine(4, 40)}
      {pine(146, 41, 1)}
      {[24, 27, 132, 135].map((x) => (
        <rect key={x} x={x} y="34" width="1" height="6" className="land__tree" />
      ))}
    </g>
  ),
  garden: (
    <g>
      {[30, 42, 54, 66, 78, 90, 102, 114].map((x, i) => (
        <g key={x}>
          <rect x={x} y="38" width="1" height="6" className="land__tree" />
          <rect x={x - 2} y="36" width="5" height="3" className="land__tree" />
          <rect x={x - 1} y="34" width="3" height="3" className={i % 2 ? 'land__tomato' : 'land__carrot'} />
        </g>
      ))}
      <rect x="128" y="30" width="20" height="14" className="land__wood" />
      <path d="M126 30l12-6 12 6z" className="land__roof" />
      {win(134, 34, 6, 4)}
      {pine(6, 41)}
    </g>
  ),
  meadow: (
    <g>
      <rect x="110" y="22" width="10" height="22" className="land__stone" />
      <path d="M108 22l7-6 7 6z" className="land__roof" />
      <g className="land__blades">
        <rect x="114" y="6" width="2" height="22" className="land__wood" />
        <rect x="104" y="16" width="22" height="2" className="land__wood" />
      </g>
      {win(113, 30, 4, 4)}
      {[10, 22, 34, 48, 60, 72, 86, 134, 146].map((x, i) => (
        <rect key={x} x={x} y={41 - (i % 2)} width="2" height="2" className={i % 3 === 0 ? 'land__tomato' : i % 3 === 1 ? 'land__gold' : 'land__window'} />
      ))}
      {pine(140, 42)}
    </g>
  ),
};
