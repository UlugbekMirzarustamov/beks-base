/**
 * Decorate the cabin: every decoration is free to put on display, swap or put away.
 * (No coins or XP any more.)
 */
import { useEffect, useRef } from 'react';
import { SHOP_ITEMS, SLOT_NAMES, type ShopItem } from '../lib/shop';
import { sfx } from '../lib/sound';
import { DECOR_SIZE, drawDecor } from '../scene/Cabin';
import { useStore } from '../state/store';
import { Panel } from '../ui/kit';

/** A crisp, scaled-up pixel preview of one item. */
function Preview({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [w, h] = DECOR_SIZE[id] ?? [10, 10];
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w + 2, h + 2);
    drawDecor(ctx, id, 1, 1);
  }, [id, w, h]);
  return <canvas ref={ref} width={w + 2} height={h + 2} className="shop-item__preview" style={{ aspectRatio: `${w + 2} / ${h + 2}` }} aria-hidden="true" />;
}

function ItemCard({ item }: { item: ShopItem }) {
  const { data, update } = useStore();
  const shown = data.shop.placed[item.slot] === item.id;
  const takenBy = SHOP_ITEMS.find((i) => i.id === data.shop.placed[item.slot] && i.id !== item.id);

  const display = () => {
    update((d) => void (d.shop.placed[item.slot] = item.id));
    sfx('pop');
  };
  const putAway = () => update((d) => void delete d.shop.placed[item.slot]);

  return (
    <li className={`shop-item is-owned ${shown ? 'is-shown' : ''}`}>
      <Preview id={item.id} />
      <strong>{item.name}</strong>
      <small className="muted">{item.description}</small>
      <small className="shop-item__slot">Goes on the {SLOT_NAMES[item.slot]}</small>
      {shown ? (
        <button type="button" className="btn btn--small" onClick={putAway}>
          Put away
        </button>
      ) : (
        <button type="button" className="btn btn--small" onClick={display} title={takenBy ? `Swaps out ${takenBy.name}` : undefined}>
          Display{takenBy ? ' (swap)' : ''}
        </button>
      )}
    </li>
  );
}

export function CabinShop() {
  return (
    <Panel title="Decorate the cabin" icon="house">
      <p className="muted small">Pick what goes where. Everything is free; one thing shows in each spot.</p>
      <ul className="shop">
        {SHOP_ITEMS.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </ul>
    </Panel>
  );
}
