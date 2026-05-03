'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Entry, PublicUser } from '@/lib/types';
import { ToastHost, toast } from '@/components/Toast';
import { api, compressImage } from '@/components/api';

const CUP_ML = 240;

type Props = {
  me: PublicUser;
  kids: PublicUser[];
  initialUserId: string;
  initialEntries: Entry[];
};

export default function Dashboard({ me, kids, initialUserId, initialEntries }: Props) {
  const router = useRouter();
  const [activeUserId, setActiveUserId] = useState<string>(initialUserId);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const allViewable: PublicUser[] = me.role === 'parent' ? [me, ...kids] : [me];
  const activeUser = allViewable.find((u) => u.id === activeUserId) || me;

  const todayKey = new Date().toDateString();
  const todays = entries.filter((e) => new Date(e.ts).toDateString() === todayKey);
  const calToday = todays.filter((e) => e.type === 'food').reduce((s, e) => s + (e.calories || 0), 0);
  const proteinToday = todays.filter((e) => e.type === 'food').reduce((s, e) => s + (e.protein_g || 0), 0);
  const waterToday = todays.filter((e) => e.type === 'water').reduce((s, e) => s + (e.ml || 0), 0);
  const calPct = Math.min(100, Math.round((calToday / Math.max(1, activeUser.calorie_goal)) * 100));
  const proteinPct = Math.min(100, Math.round((proteinToday / Math.max(1, activeUser.protein_goal)) * 100));
  const waterPct = Math.min(100, Math.round((waterToday / Math.max(1, activeUser.water_goal_ml)) * 100));
  const cupsTaken = Math.round(waterToday / CUP_ML);
  const cupsGoal = Math.max(1, Math.round(activeUser.water_goal_ml / CUP_ML));

  async function switchUser(uid: string) {
    setActiveUserId(uid);
    setBusy(true);
    try {
      const r = await api<{ entries: Entry[] }>(`/api/entries?userId=${uid}&days=7`);
      setEntries(r.entries);
    } catch (e) {
      toast(String((e as Error).message), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function addCup() {
    setBusy(true);
    try {
      const r = await api<{ entry: Entry }>(`/api/entries`, {
        method: 'POST',
        json: { userId: activeUserId, type: 'water', ml: CUP_ML },
      });
      setEntries((prev) => [r.entry, ...prev]);
      toast('+ 1 cup of water', 'success');
    } catch (e) {
      toast(String((e as Error).message), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await api(`/api/entries/${id}`, { method: 'DELETE' });
    } catch (e) {
      toast(String((e as Error).message), 'error');
      // refetch to stay consistent
      const r = await api<{ entries: Entry[] }>(`/api/entries?userId=${activeUserId}&days=7`);
      setEntries(r.entries);
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 font-extrabold text-xl">
          <span
            className="inline-grid place-items-center w-9 h-9 rounded-xl text-white"
            style={{ background: 'linear-gradient(135deg,#a78bfa,#f472b6)' }}
          >
            <CamIcon />
          </span>
          Snap &amp; Track
        </div>
        <div className="flex gap-2">
          {me.role === 'parent' && (
            <a className="btn btn-secondary !px-3 !py-2 text-sm" href="/kids">
              Kids
            </a>
          )}
          <button className="btn btn-secondary !px-3 !py-2 text-sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {me.role === 'parent' && allViewable.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {allViewable.map((u) => (
            <button
              key={u.id}
              onClick={() => switchUser(u.id)}
              className={
                'px-3 py-2 rounded-full text-sm font-bold flex-shrink-0 border ' +
                (u.id === activeUserId
                  ? 'bg-accent text-white border-transparent'
                  : 'bg-white text-ink border-[#ece9f7]')
              }
            >
              {u.name}
            </button>
          ))}
        </div>
      )}

      <section className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-full grid place-items-center text-white font-bold text-lg"
          style={{ background: activeUser.color }}
        >
          {initials(activeUser.name)}
        </div>
        <div>
          <div className="font-extrabold text-xl flex items-center gap-2">
            Hi {activeUser.name.split(' ')[0]}!
            {activeUser.is_athlete && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent-soft text-accent">
                Athlete
              </span>
            )}
          </div>
          <div className="text-sm muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Calories" value={`${calToday}`} sub={`of ${activeUser.calorie_goal}`} unit="kcal" pct={calPct} barColor="#7c3aed" />
        <Stat
          label="Protein"
          value={`${proteinToday}`}
          sub={`of ${activeUser.protein_goal} g`}
          unit="g"
          pct={proteinPct}
          barColor="#16a34a"
        />
        <Stat
          label="Water"
          value={`${waterToday}`}
          sub={`${cupsTaken}/${cupsGoal} cups`}
          unit="ml"
          pct={waterPct}
          barColor="#2dd4ff"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          className="btn !rounded-2xl !py-5 !text-base"
          onClick={() => setShowAdd(true)}
          disabled={busy}
        >
          <CamIcon /> Snap food
        </button>
        <button className="btn btn-water !rounded-2xl !py-5 !text-base" onClick={addCup} disabled={busy}>
          <DropIcon /> + 1 cup
        </button>
      </div>

      <h2 className="text-lg font-bold mt-6 mb-2">Today</h2>
      {todays.length === 0 ? (
        <div className="text-center muted py-6 text-sm">Nothing logged yet today.</div>
      ) : (
        <ul className="flex flex-col gap-2">{todays.map((e) => <EntryRow key={e.id} e={e} onDelete={deleteEntry} />)}</ul>
      )}

      <h2 className="text-lg font-bold mt-6 mb-2">Last 7 days</h2>
      {(() => {
        const byDay: Record<string, Entry[]> = {};
        for (const e of entries) {
          const k = new Date(e.ts).toDateString();
          if (k === todayKey) continue;
          (byDay[k] ||= []).push(e);
        }
        const keys = Object.keys(byDay).sort((a, b) => +new Date(b) - +new Date(a));
        if (!keys.length) return <div className="text-center muted py-4 text-sm">No history yet.</div>;
        return keys.map((k) => {
          const list = byDay[k];
          const cal = list.filter((e) => e.type === 'food').reduce((s, e) => s + (e.calories || 0), 0);
          const prot = list.filter((e) => e.type === 'food').reduce((s, e) => s + (e.protein_g || 0), 0);
          const water = list.filter((e) => e.type === 'water').reduce((s, e) => s + (e.ml || 0), 0);
          return (
            <details key={k} className="card !p-3 mb-2">
              <summary className="cursor-pointer flex justify-between items-center">
                <div>
                  <div className="font-semibold">{k}</div>
                  <div className="text-xs muted">{cal} kcal · {prot}g protein · {water} ml</div>
                </div>
              </summary>
              <ul className="flex flex-col gap-2 mt-2">
                {list.map((e) => <EntryRow key={e.id} e={e} onDelete={deleteEntry} />)}
              </ul>
            </details>
          );
        });
      })()}

      {showAdd && (
        <AddFoodModal
          userId={activeUserId}
          onClose={() => setShowAdd(false)}
          onSaved={(entry) => {
            setEntries((prev) => [entry, ...prev]);
            setShowAdd(false);
            toast('Meal saved', 'success');
          }}
        />
      )}
      <ToastHost />
    </>
  );
}

function Stat({
  label,
  value,
  sub,
  unit,
  pct,
  barColor,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  unit?: string;
  pct: number;
  barColor: string;
}) {
  return (
    <div className="card !p-3">
      <div className="text-[10px] muted uppercase tracking-wider font-bold">{label}</div>
      <div className="text-2xl font-extrabold mt-1 leading-none">
        {value}
        {unit && <span className="text-xs font-normal muted ml-1">{unit}</span>}
      </div>
      <div className="text-[11px] muted mt-1 truncate">{sub}</div>
      <div className="h-2 rounded-full bg-[#ece9f7] mt-2 overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

function EntryRow({ e, onDelete }: { e: Entry; onDelete: (id: string) => void }) {
  const isWater = e.type === 'water';
  return (
    <li className="flex items-center gap-3 p-2 border border-[#ece9f7] rounded-2xl bg-white">
      <div
        className={
          'w-12 h-12 rounded-xl grid place-items-center flex-shrink-0 ' +
          (isWater ? 'bg-water-soft text-[#07739c]' : 'bg-accent-soft text-accent')
        }
      >
        {isWater ? <DropIcon /> : <CamIcon />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{isWater ? 'Water' : e.food_name}</div>
        <div className="text-xs muted">
          {new Date(e.ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          {!isWater && e.notes ? ` · ${e.notes}` : ''}
          {!isWater && e.confidence ? ` · ${e.confidence} confidence` : ''}
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-sm">
          {isWater ? `${e.ml} ml` : `${e.calories ?? 0} kcal`}
        </div>
        {!isWater && (e.protein_g ?? 0) > 0 && (
          <div className="text-[11px] text-green-700 font-semibold">{e.protein_g}g protein</div>
        )}
      </div>
      <button className="btn btn-ghost !p-2" onClick={() => onDelete(e.id)} aria-label="Delete">
        <TrashIcon />
      </button>
    </li>
  );
}

function AddFoodModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
}) {
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cals, setCals] = useState('');
  const [protein, setProtein] = useState('');
  const [notes, setNotes] = useState('');
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high' | null>(null);
  const [status, setStatus] = useState<string>('');
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const dataUrl = await compressImage(f, 1024, 0.8);
      setPhotoData(dataUrl);
      setStatus('Looking…');
      setBusy(true);
      const r = await api<{ food: string; calories: number; protein_g: number; confidence: string; notes: string }>(
        '/api/analyze',
        { method: 'POST', json: { image: dataUrl } },
      );
      setName(r.food);
      setCals(String(r.calories));
      setProtein(String(r.protein_g ?? 0));
      setNotes(r.notes);
      setConfidence((r.confidence as 'low' | 'medium' | 'high') ?? 'medium');
      setStatus(`Got it · ${r.confidence} confidence`);
    } catch (err) {
      setStatus('Could not analyze — fill it in by hand');
      toast(String((err as Error).message), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      toast('Type what you ate', 'error');
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ entry: Entry }>('/api/entries', {
        method: 'POST',
        json: {
          userId,
          type: 'food',
          food_name: name.trim(),
          calories: Math.max(0, parseInt(cals, 10) || 0),
          protein_g: Math.max(0, parseInt(protein, 10) || 0),
          notes: notes.trim() || null,
          confidence,
        },
      });
      onSaved(r.entry);
    } catch (e) {
      toast(String((e as Error).message), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-3">
      <div className="card w-full max-w-[460px] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-extrabold text-lg">Snap food</h3>
          <button onClick={onClose} className="btn btn-secondary !px-2 !py-1 text-sm">Close</button>
        </div>
        <div className="rounded-2xl border border-dashed border-[#d6d2ea] bg-accent-soft text-accent aspect-[4/3] grid place-items-center overflow-hidden mb-3">
          {photoData ? (
            <img src={photoData} alt="" className="w-full h-full object-cover" />
          ) : (
            <CamIcon size={36} />
          )}
        </div>
        <label className="btn !w-full mb-3 cursor-pointer">
          {photoData ? 'Choose another photo' : 'Choose / take photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onPick}
          />
        </label>
        {status && <div className="text-xs muted mb-2">{status}</div>}
        <label className="label">What is it?</label>
        <input className="field mb-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apple, mac and cheese" />
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="label">Calories (kcal)</label>
            <input className="field" type="number" min={0} value={cals} onChange={(e) => setCals(e.target.value)} />
          </div>
          <div>
            <label className="label">Protein (g)</label>
            <input className="field" type="number" min={0} value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
        </div>
        <label className="label">Notes (optional)</label>
        <input className="field mb-4" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. small bowl, with milk" />
        <button className="btn !w-full" onClick={save} disabled={busy}>
          Save meal
        </button>
      </div>
    </div>
  );
}

function initials(name: string) {
  return (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function CamIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h3l2-3h8l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function DropIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
