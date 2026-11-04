/**
 * The cabin shop: spend coins (earned from XP) on decorations for the cabin.
 */
import { useEffect, useRef } from 'react';
import { coins, coinsEarned, SHOP_ITEMS, SLOT_NAMES, type ShopItem } from '../lib/shop';
import { sfx } from '../lib/sound';
import { DECOR_SIZE, drawDecor } from '../scene/Cabin';
import { useStore } from '../state/store';
import { PixelIcon } from '../ui/icons';
import { Panel, useConfirm } from '../ui/kit';

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
  const { data, update, toast } = useStore();
  const ask = useConfirm();
  const owned = data.shop.owned.includes(item.id);
  const shown = data.shop.placed[item.slot] === item.id;
  const wallet = coins(data);
  const takenBy = SHOP_ITEMS.find((i) => i.id === data.shop.placed[item.slot] && i.id !== item.id);

  const buy = async () => {
    if (wallet < item.price) return;
    if (!(await ask(`Buy "${item.name}" for ${item.price} coins?`, { ok: 'Buy', danger: false }))) return;
    update((d) => {
      d.shop.owned.push(item.id);
      d.shop.spent += item.price;
      d.shop.placed[item.slot] = item.id; // put it straight into the cabin
    });
    sfx('coin');
    toast(`${item.name} is now in your cabin!`, 'level');
  };
  const display = () => {
    update((d) => void (d.shop.placed[item.slot] = item.id));
    sfx('pop');
  };
  const putAway = () => update((d) => void delete d.shop.placed[item.slot]);

  return (
    <li className={`shop-item ${owned ? 'is-owned' : ''} ${shown ? 'is-shown' : ''}`}>
      <Preview id={item.id} />
      <strong>{item.name}</strong>
      <small className="muted">{item.description}</small>
      <small className="shop-item__slot">Goes on the {SLOT_NAMES[item.slot]}</small>
      {!owned ? (
        <button type="button" className="btn btn--primary btn--small" onClick={buy} disabled={wallet < item.price}>
          <PixelIcon name="coin" size={14} /> {item.price}
        </button>
      ) : shown ? (
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
  const { data } = useStore();
  const wallet = coins(data);
  const items = [...SHOP_ITEMS].sort((a, b) => a.price - b.price);
  return (
    <Panel title="Cabin shop" icon="coin">
      <div className="shop-wallet">
        <PixelIcon name="coin" size={36} />
        <span className="big-number big-number--small">{wallet}</span>
        <span className="muted small">
          coins · you earn 1 coin for every 2 XP ({coinsEarned(data)} earned so far). Pray, study, reflect and save to earn more.
        </span>
      </div>
      <ul className="shop">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </ul>
    </Panel>
  );
}
