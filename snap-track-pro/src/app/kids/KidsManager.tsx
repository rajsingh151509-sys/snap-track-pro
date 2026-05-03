'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PublicUser } from '@/lib/types';
import { api } from '@/components/api';
import { ToastHost, toast } from '@/components/Toast';

const PALETTE = ['#7c3aed', '#ec4899', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

type EditState = { mode: 'new' } | { mode: 'edit'; kid: PublicUser } | null;

export default function KidsManager({ initialKids }: { initialKids: PublicUser[] }) {
  const [kids, setKids] = useState<PublicUser[]>(initialKids);
  const [editing, setEditing] = useState<EditState>(null);

  async function remove(id: string) {
    if (!confirm('Delete this kid account and all their entries?')) return;
    try {
      await api(`/api/kids/${id}`, { method: 'DELETE' });
      setKids((xs) => xs.filter((k) => k.id !== id));
      toast('Deleted', 'success');
    } catch (e) {
      toast(String((e as Error).message), 'error');
    }
  }

  return (
    <>
      <header className="flex items-center justify-between mb-4">
        <Link href="/" className="btn btn-secondary !px-3 !py-2 text-sm">← Back</Link>
        <h1 className="text-xl font-extrabold">Kids</h1>
        <button className="btn !px-3 !py-2 text-sm" onClick={() => setEditing({ mode: 'new' })}>
          + Add kid
        </button>
      </header>

      {kids.length === 0 ? (
        <div className="card text-center text-sm muted">
          No kid accounts yet. Tap <b>+ Add kid</b> to create one.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {kids.map((k) => (
            <li key={k.id} className="card !p-3 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full grid place-items-center text-white font-bold"
                style={{ background: k.color }}
              >
                {initials(k.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">
                  {k.name}
                  {k.is_athlete && (
                    <span className="ml-2 inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent-soft text-accent align-middle">
                      Athlete
                    </span>
                  )}
                </div>
                <div className="text-xs muted truncate">
                  @{k.username} · {k.age ? `Age ${k.age} · ` : ''}{k.calorie_goal} kcal · {k.protein_goal}g protein · {k.water_goal_ml} ml
                </div>
              </div>
              <button className="btn btn-secondary !px-3 !py-2 text-sm" onClick={() => setEditing({ mode: 'edit', kid: k })}>
                Edit
              </button>
              <button className="btn btn-danger !px-3 !py-2 text-sm" onClick={() => remove(k.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <KidEditor
          state={editing}
          onClose={() => setEditing(null)}
          onSaved={(kid, isNew) => {
            setKids((xs) => (isNew ? [...xs, kid] : xs.map((x) => (x.id === kid.id ? kid : x))));
            setEditing(null);
            toast(isNew ? 'Kid added' : 'Saved', 'success');
          }}
        />
      )}
      <ToastHost />
    </>
  );
}

function KidEditor({
  state,
  onClose,
  onSaved,
}: {
  state: { mode: 'new' } | { mode: 'edit'; kid: PublicUser };
  onClose: () => void;
  onSaved: (kid: PublicUser, isNew: boolean) => void;
}) {
  const isNew = state.mode === 'new';
  const k = isNew ? null : state.kid;

  const [name, setName] = useState(k?.name ?? '');
  const [username, setUsername] = useState(k?.username ?? '');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState<string>(k?.age ? String(k.age) : '');
  const [gender, setGender] = useState<string>(k?.gender ?? '');
  const [heightCm, setHeightCm] = useState<string>(k?.height_cm ? String(k.height_cm) : '');
  const [weightKg, setWeightKg] = useState<string>(k?.weight_kg ? String(k.weight_kg) : '');
  const [color, setColor] = useState<string>(k?.color ?? PALETTE[0]);
  const [calorieGoal, setCalorieGoal] = useState<string>(String(k?.calorie_goal ?? 1500));
  const [waterGoalMl, setWaterGoalMl] = useState<string>(String(k?.water_goal_ml ?? 1400));
  const [proteinGoal, setProteinGoal] = useState<string>(String(k?.protein_goal ?? 50));
  const [isAthlete, setIsAthlete] = useState<boolean>(k?.is_athlete ?? false);
  const [busy, setBusy] = useState(false);

  // Auto-recompute goals from age/gender/height/weight/athlete-flag unless the user has edited them.
  const [calTouched, setCalTouched] = useState(false);
  const [waterTouched, setWaterTouched] = useState(false);
  const [proteinTouched, setProteinTouched] = useState(false);

  function recompute(
    nextAge = age,
    nextGender = gender,
    nextH = heightCm,
    nextW = weightKg,
    nextAthlete = isAthlete,
  ) {
    const a = parseInt(nextAge, 10) || 0;
    const w = parseFloat(nextW) || 0;
    const h = parseFloat(nextH) || 0;
    if (a < 2) return;
    // Calories: athletes need ~15-25% more — bump activity factor accordingly.
    let cal: number;
    const activity = nextAthlete ? 1.7 : 1.4;
    if (w > 0 && h > 0) {
      const bmr = nextGender === 'female' ? 10 * w + 6.25 * h - 5 * a - 161 : 10 * w + 6.25 * h - 5 * a + 5;
      cal = Math.max(800, Math.min(5000, Math.round((bmr * activity) / 50) * 50));
    } else {
      const base = a <= 4 ? 1200 : a <= 8 ? 1500 : a <= 12 ? 1800 : a <= 17 ? 2200 : nextGender === 'female' ? 2000 : 2500;
      cal = nextAthlete ? Math.round((base * 1.2) / 50) * 50 : base;
    }
    // Water: athletes drink more.
    let water: number;
    const mlPerKg = nextAthlete ? 45 : 33;
    if (w > 0) water = Math.max(800, Math.min(5000, Math.round((w * mlPerKg) / 50) * 50));
    else {
      const base = a <= 4 ? 1000 : a <= 8 ? 1400 : a <= 12 ? 1800 : a <= 17 ? 2200 : 2500;
      water = nextAthlete ? Math.round((base * 1.3) / 50) * 50 : base;
    }
    // Protein: 1.0 g/kg normally; 1.5 g/kg for athletes. Round to nearest 5g.
    let protein: number;
    const gPerKg = nextAthlete ? 1.5 : 1.0;
    if (w > 0) protein = Math.max(15, Math.min(300, Math.round((w * gPerKg) / 5) * 5));
    else {
      const base = a <= 4 ? 20 : a <= 8 ? 25 : a <= 12 ? 35 : a <= 17 ? 50 : nextGender === 'female' ? 50 : 60;
      protein = nextAthlete ? Math.round((base * 1.4) / 5) * 5 : base;
    }
    if (!calTouched) setCalorieGoal(String(cal));
    if (!waterTouched) setWaterGoalMl(String(water));
    if (!proteinTouched) setProteinGoal(String(protein));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast('Enter a name', 'error');
    setBusy(true);
    try {
      if (isNew) {
        if (!username.trim()) return toast('Pick a username', 'error');
        if (password.length < 6) return toast('Password must be 6+ characters', 'error');
        const r = await api<{ kid: PublicUser }>('/api/kids', {
          method: 'POST',
          json: {
            name: name.trim(),
            username: username.trim(),
            password,
            age: age ? parseInt(age, 10) : null,
            gender: gender || null,
            height_cm: heightCm ? parseFloat(heightCm) : null,
            weight_kg: weightKg ? parseFloat(weightKg) : null,
            color,
            calorie_goal: parseInt(calorieGoal, 10) || 1500,
            water_goal_ml: parseInt(waterGoalMl, 10) || 1400,
            protein_goal: parseInt(proteinGoal, 10) || 50,
            is_athlete: isAthlete,
          },
        });
        onSaved(r.kid, true);
      } else {
        const payload: Record<string, unknown> = {
          name: name.trim(),
          age: age ? parseInt(age, 10) : null,
          gender: gender || null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          color,
          calorie_goal: parseInt(calorieGoal, 10) || 1500,
          water_goal_ml: parseInt(waterGoalMl, 10) || 1400,
          protein_goal: parseInt(proteinGoal, 10) || 50,
          is_athlete: isAthlete,
        };
        if (password) payload.password = password;
        const r = await api<{ user: PublicUser }>(`/api/kids/${k!.id}`, {
          method: 'PATCH',
          json: payload,
        });
        onSaved(r.user, false);
      }
    } catch (err) {
      toast(String((err as Error).message), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-3">
      <form onSubmit={save} className="card w-full max-w-[460px] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-lg">{isNew ? 'New kid' : 'Edit kid'}</h3>
          <button type="button" onClick={onClose} className="btn btn-secondary !px-2 !py-1 text-sm">
            Close
          </button>
        </div>

        <div className="grid gap-3">
          <div>
            <label className="label">Name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Username</label>
              <input
                className="field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!isNew}
                placeholder="lowercase, no spaces"
                required={isNew}
              />
              {!isNew && <div className="text-xs muted mt-1">Username can't be changed.</div>}
            </div>
            <div>
              <label className="label">{isNew ? 'Password' : 'New password (optional)'}</label>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={isNew ? 6 : 0}
                required={isNew}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Age</label>
              <input
                className="field"
                type="number"
                min={2}
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  recompute(e.target.value, gender, heightCm, weightKg);
                }}
              />
            </div>
            <div>
              <label className="label">Gender</label>
              <select
                className="field"
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  recompute(age, e.target.value, heightCm, weightKg);
                }}
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Height (cm)</label>
              <input
                className="field"
                type="number"
                min={50}
                max={250}
                value={heightCm}
                onChange={(e) => {
                  setHeightCm(e.target.value);
                  recompute(age, gender, e.target.value, weightKg);
                }}
              />
            </div>
            <div>
              <label className="label">Weight (kg)</label>
              <input
                className="field"
                type="number"
                min={10}
                max={250}
                step={0.1}
                value={weightKg}
                onChange={(e) => {
                  setWeightKg(e.target.value);
                  recompute(age, gender, heightCm, e.target.value);
                }}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-2xl border border-[#ece9f7] bg-accent-soft/40 cursor-pointer">
            <input
              type="checkbox"
              checked={isAthlete}
              onChange={(e) => {
                setIsAthlete(e.target.checked);
                recompute(age, gender, heightCm, weightKg, e.target.checked);
              }}
              className="w-5 h-5 accent-accent"
            />
            <div className="flex-1">
              <div className="font-bold">Athlete</div>
              <div className="text-xs muted">
                Bumps calorie, water, and protein goals for active sports kids.
              </div>
            </div>
          </label>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={'w-9 h-9 rounded-full ' + (color === c ? 'ring-4 ring-ink/30' : '')}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Calories</label>
              <input
                className="field"
                type="number"
                min={500}
                max={5000}
                step={50}
                value={calorieGoal}
                onChange={(e) => {
                  setCalorieGoal(e.target.value);
                  setCalTouched(true);
                }}
              />
            </div>
            <div>
              <label className="label">Protein (g)</label>
              <input
                className="field"
                type="number"
                min={10}
                max={400}
                step={5}
                value={proteinGoal}
                onChange={(e) => {
                  setProteinGoal(e.target.value);
                  setProteinTouched(true);
                }}
              />
            </div>
            <div>
              <label className="label">Water (ml)</label>
              <input
                className="field"
                type="number"
                min={200}
                max={5000}
                step={50}
                value={waterGoalMl}
                onChange={(e) => {
                  setWaterGoalMl(e.target.value);
                  setWaterTouched(true);
                }}
              />
            </div>
          </div>
          <div className="text-xs muted">Goals auto-fill from age, gender, height, weight &amp; athlete flag — adjust anytime.</div>

          <button className="btn !w-full" disabled={busy}>
            {busy ? 'Saving…' : isNew ? 'Create kid' : 'Save changes'}
          </button>
        </div>
      </form>
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
