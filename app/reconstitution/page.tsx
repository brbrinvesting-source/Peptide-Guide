'use client';

import { useState, useMemo } from 'react';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-green-500 transition-colors"
    >
      {children}
    </select>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6 space-y-5">
      {children}
    </div>
  );
}

function ResultBox({ accent = 'green', children }: { accent?: 'green' | 'blue' | 'purple'; children: React.ReactNode }) {
  const colors = {
    green: 'bg-green-950/30 border-green-800/40',
    blue: 'bg-blue-950/30 border-blue-800/40',
    purple: 'bg-purple-950/30 border-purple-800/40',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent]}`}>
      {children}
    </div>
  );
}

function SectionTitle({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <div className="border-b border-gray-800 pb-4 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">
          {n}
        </span>
        <h2 className="text-base font-bold text-gray-100">{title}</h2>
      </div>
      <p className="text-xs text-gray-500 ml-8">{subtitle}</p>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DoseUnit = 'mcg' | 'mg';

interface BlendComponent {
  name: string;
  fraction: number;
}

interface BlendPreset {
  label: string;
  components: BlendComponent[];
}

interface CustomComponent {
  id: string;
  name: string;
  amount: string;
  unit: 'mg' | 'mcg';
}

// ─── Blend presets ────────────────────────────────────────────────────────────

const BLEND_PRESETS: BlendPreset[] = [
  {
    label: 'Wolverine Stack — BPC-157 + TB-500',
    components: [
      { name: 'BPC-157', fraction: 0.5 },
      { name: 'TB-500', fraction: 0.5 },
    ],
  },
  {
    label: 'BPC-157 + TB-500 + Cartalax',
    components: [
      { name: 'BPC-157', fraction: 1 / 3 },
      { name: 'TB-500', fraction: 1 / 3 },
      { name: 'Cartalax', fraction: 1 / 3 },
    ],
  },
  {
    label: 'CJC-1295 No DAC + Ipamorelin',
    components: [
      { name: 'CJC-1295 No DAC', fraction: 0.5 },
      { name: 'Ipamorelin', fraction: 0.5 },
    ],
  },
  {
    label: 'Tesamorelin + Ipamorelin',
    components: [
      { name: 'Tesamorelin', fraction: 0.5 },
      { name: 'Ipamorelin', fraction: 0.5 },
    ],
  },
  {
    label: 'Tesamorelin + CJC-1295 + Ipamorelin',
    components: [
      { name: 'Tesamorelin', fraction: 1 / 3 },
      { name: 'CJC-1295 No DAC', fraction: 1 / 3 },
      { name: 'Ipamorelin', fraction: 1 / 3 },
    ],
  },
  {
    label: 'GLOW Blend — GHK-Cu + BPC-157 + TB-500',
    components: [
      { name: 'GHK-Cu', fraction: 5 / 7 },   // 50 mg of 70 mg standard vial
      { name: 'BPC-157', fraction: 1 / 7 },   // 10 mg
      { name: 'TB-500', fraction: 1 / 7 },    // 10 mg
    ],
  },
  {
    label: 'KLOW Blend — GHK-Cu + BPC-157 + TB-500 + KPV',
    components: [
      { name: 'GHK-Cu', fraction: 50 / 80 },  // 50 mg of 80 mg standard vial
      { name: 'BPC-157', fraction: 10 / 80 }, // 10 mg
      { name: 'TB-500', fraction: 10 / 80 },  // 10 mg
      { name: 'KPV', fraction: 10 / 80 },     // 10 mg
    ],
  },
  {
    label: 'Adamax — Semax + Selank',
    components: [
      { name: 'Semax', fraction: 0.5 },
      { name: 'Selank', fraction: 0.5 },
    ],
  },
  {
    label: 'TA1 + Thymulin',
    components: [
      { name: 'Thymosin Alpha 1', fraction: 0.5 },
      { name: 'Thymulin', fraction: 0.5 },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toMg(dose: number, unit: DoseUnit): number {
  return unit === 'mcg' ? dose / 1000 : dose;
}

function fmtAmount(mg: number): string {
  if (!Number.isFinite(mg) || mg <= 0) return '—';
  if (mg >= 1) return `${parseFloat(mg.toFixed(3))} mg`;
  const mcg = mg * 1000;
  if (mcg >= 1) return `${parseFloat(mcg.toFixed(1))} mcg`;
  return `${parseFloat((mcg * 1000).toFixed(1))} ng`;
}

function fmtDoses(n: number): string {
  return `~${parseFloat(n.toFixed(1))}`;
}

function fmtWeeks(weeks: number): string {
  const w = Math.floor(weeks);
  const d = Math.round((weeks - w) * 7);
  if (d === 0) return `${w} wk${w !== 1 ? 's' : ''}`;
  if (w === 0) return `${d} day${d !== 1 ? 's' : ''}`;
  return `${w} wk${w !== 1 ? 's' : ''} ${d} day${d !== 1 ? 's' : ''}`;
}

function pf(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReconstitutionPage() {

  // ── 1. Forward ──────────────────────────────────────────────────────────────
  const [fwdVial, setFwdVial] = useState('5');
  const [fwdBac, setFwdBac] = useState('2');
  const [fwdDose, setFwdDose] = useState('250');
  const [fwdUnit, setFwdUnit] = useState<DoseUnit>('mcg');

  const fwdResult = useMemo(() => {
    const vialMg = pf(fwdVial);
    const bacMl = pf(fwdBac);
    const dose = pf(fwdDose);
    if (!vialMg || !bacMl || !dose) return null;
    const doseMg = toMg(dose, fwdUnit);
    const concMgMl = vialMg / bacMl;
    const volumeMl = doseMg / concMgMl;
    const syringeUnits = volumeMl * 100;
    const dosesPerVial = vialMg / doseMg;
    return { concMgMl, volumeMl, syringeUnits, dosesPerVial };
  }, [fwdVial, fwdBac, fwdDose, fwdUnit]);

  // ── 2. Reverse ──────────────────────────────────────────────────────────────
  const [revVial, setRevVial] = useState('5');
  const [revDose, setRevDose] = useState('250');
  const [revUnit, setRevUnit] = useState<DoseUnit>('mcg');
  const [revTargetUnits, setRevTargetUnits] = useState('10');

  const revResult = useMemo(() => {
    const vialMg = pf(revVial);
    const dose = pf(revDose);
    const targetUnits = pf(revTargetUnits);
    if (!vialMg || !dose || !targetUnits) return null;
    const doseMg = toMg(dose, revUnit);
    const volumeMl = targetUnits / 100;
    const concMgMl = doseMg / volumeMl;
    const bacMl = vialMg / concMgMl;
    const dosesPerVial = vialMg / doseMg;
    return { bacMl, concMgMl, dosesPerVial, volumeMl };
  }, [revVial, revDose, revUnit, revTargetUnits]);

  // ── 3. Blend ────────────────────────────────────────────────────────────────
  const [blendPresetIdx, setBlendPresetIdx] = useState<number>(0); // 0-indexed into BLEND_PRESETS; -1 = custom
  const [blendVial, setBlendVial] = useState('10');
  const [blendBac, setBlendBac] = useState('2');
  const [blendDoseUnits, setBlendDoseUnits] = useState('10');
  const [customComponents, setCustomComponents] = useState<CustomComponent[]>([
    { id: '1', name: '', amount: '', unit: 'mg' },
    { id: '2', name: '', amount: '', unit: 'mg' },
  ]);

  const isCustomBlend = blendPresetIdx === -1;
  const activePreset: BlendPreset | null = blendPresetIdx >= 0 ? BLEND_PRESETS[blendPresetIdx] : null;

  const blendResult = useMemo(() => {
    const vialMg = pf(blendVial);
    const bacMl = pf(blendBac);
    const doseUnits = pf(blendDoseUnits);
    if (!vialMg || !bacMl || !doseUnits) return null;

    const concMgMl = vialMg / bacMl;
    const volumeMl = doseUnits / 100;
    const dosesPerVial = bacMl / volumeMl;

    let components: BlendComponent[] = [];

    if (activePreset) {
      components = activePreset.components;
    } else {
      // Custom: build fractions from entered amounts
      const filled = customComponents.filter((c) => c.name && pf(c.amount) > 0);
      if (filled.length < 2) return null;
      const totalMg = filled.reduce((sum, c) => {
        const mg = c.unit === 'mcg' ? pf(c.amount) / 1000 : pf(c.amount);
        return sum + mg;
      }, 0);
      if (totalMg <= 0) return null;
      components = filled.map((c) => {
        const mg = c.unit === 'mcg' ? pf(c.amount) / 1000 : pf(c.amount);
        return { name: c.name, fraction: mg / totalMg };
      });
    }

    const perDose = components.map((c) => ({
      name: c.name,
      amountMg: c.fraction * vialMg * volumeMl / bacMl,
    }));

    return { concMgMl, volumeMl, dosesPerVial, perDose };
  }, [blendVial, blendBac, blendDoseUnits, activePreset, customComponents]);

  function addCustomComponent() {
    setCustomComponents((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', amount: '', unit: 'mg' },
    ]);
  }

  function removeCustomComponent(id: string) {
    setCustomComponents((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCustomComponent(id: string, field: keyof CustomComponent, value: string) {
    setCustomComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  // ── 4. Vial Supply ──────────────────────────────────────────────────────────
  const [supVial, setSupVial] = useState('5');
  const [supBac, setSupBac] = useState('2');
  const [supDose, setSupDose] = useState('250');
  const [supUnit, setSupUnit] = useState<DoseUnit>('mcg');
  const [supDosesPerWeek, setSupDosesPerWeek] = useState('7');
  const [supCycleWeeks, setSupCycleWeeks] = useState('8');

  const supResult = useMemo(() => {
    const vialMg = pf(supVial);
    const dose = pf(supDose);
    const dpw = pf(supDosesPerWeek);
    const weeks = pf(supCycleWeeks);
    if (!vialMg || !dose || !dpw || !weeks) return null;
    const doseMg = toMg(dose, supUnit);
    const dosesPerVial = vialMg / doseMg;
    const vialDurationWeeks = dosesPerVial / dpw;
    const totalDoses = dpw * weeks;
    const vialsNeeded = Math.ceil(totalDoses / dosesPerVial);
    const extraDoses = Math.round(vialsNeeded * dosesPerVial - totalDoses);
    const bacMl = pf(supBac);
    let syringeUnits: number | null = null;
    if (bacMl) {
      const concMgMl = vialMg / bacMl;
      syringeUnits = (doseMg / concMgMl) * 100;
    }
    return { dosesPerVial, vialDurationWeeks, totalDoses, vialsNeeded, extraDoses, syringeUnits };
  }, [supVial, supBac, supDose, supUnit, supDosesPerWeek, supCycleWeeks]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/60 py-10 px-4">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs text-gray-500 mb-1">Peptide Guide / Reconstitution</p>
          <h1 className="text-3xl font-bold text-white">Reconstitution Calculator</h1>
          <p className="mt-2 text-sm text-gray-400">
            For lyophilized (powder) peptide vials reconstituted with bacteriostatic water and drawn
            with a U-100 insulin syringe (100 units = 1 mL).
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">

        {/* ── 1. Forward ─────────────────────────────────────────────────────── */}
        <Card>
          <SectionTitle
            n={1}
            title="Forward — I have a vial and BAC water, what's my dose?"
            subtitle="Enter your vial strength and how much BAC water you added to find out where to draw on your syringe."
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vial strength (mg)</Label>
              <Input
                type="text" inputMode="decimal"
                value={fwdVial} onChange={(e) => setFwdVial(e.target.value)}
                placeholder="e.g. 5"
              />
              <p className="text-xs text-gray-600 mt-1">Total peptide in vial</p>
            </div>
            <div>
              <Label>BAC water added (mL)</Label>
              <Input
                type="text" inputMode="decimal"
                value={fwdBac} onChange={(e) => setFwdBac(e.target.value)}
                placeholder="e.g. 2"
              />
              <p className="text-xs text-gray-600 mt-1">Volume you reconstituted with</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Desired dose</Label>
              <Input
                type="text" inputMode="decimal"
                value={fwdDose} onChange={(e) => setFwdDose(e.target.value)}
                placeholder="e.g. 250"
              />
            </div>
            <div>
              <Label>Dose unit</Label>
              <Select value={fwdUnit} onChange={(e) => setFwdUnit(e.target.value as DoseUnit)}>
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </Select>
            </div>
          </div>

          {fwdResult && (
            <ResultBox accent="green">
              <p className="text-xs text-gray-400 mb-1">Draw to this mark on a U-100 syringe</p>
              <p className="text-3xl font-bold text-green-400">
                {parseFloat(fwdResult.syringeUnits.toFixed(2))} units
              </p>
              <p className="text-sm text-gray-300 mt-1">
                = <strong>{parseFloat(fwdResult.volumeMl.toFixed(4))} mL</strong> of solution
              </p>
              <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-0.5 text-xs text-gray-400">
                <p>Concentration: {parseFloat((fwdResult.concMgMl * 1000).toFixed(1))} mcg/mL
                  ({parseFloat(fwdResult.concMgMl.toFixed(4))} mg/mL)</p>
                <p>Doses per vial: {fmtDoses(fwdResult.dosesPerVial)}</p>
              </div>
            </ResultBox>
          )}
        </Card>

        {/* ── 2. Reverse ─────────────────────────────────────────────────────── */}
        <Card>
          <SectionTitle
            n={2}
            title="Reverse — I want N units per dose, how much BAC water?"
            subtitle="Know your preferred syringe mark and dose? Work backwards to find the exact BAC water volume to add."
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vial strength (mg)</Label>
              <Input
                type="text" inputMode="decimal"
                value={revVial} onChange={(e) => setRevVial(e.target.value)}
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <Label>Desired dose</Label>
              <Input
                type="text" inputMode="decimal"
                value={revDose} onChange={(e) => setRevDose(e.target.value)}
                placeholder="e.g. 250"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dose unit</Label>
              <Select value={revUnit} onChange={(e) => setRevUnit(e.target.value as DoseUnit)}>
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </Select>
            </div>
            <div>
              <Label>Target syringe units (U-100)</Label>
              <Input
                type="text" inputMode="decimal"
                value={revTargetUnits} onChange={(e) => setRevTargetUnits(e.target.value)}
                placeholder="e.g. 10"
              />
              <p className="text-xs text-gray-600 mt-1">e.g. 10 = the "10" line on syringe</p>
            </div>
          </div>

          {revResult && (
            <ResultBox accent="blue">
              <p className="text-xs text-gray-400 mb-1">Add this much BAC water</p>
              <p className="text-3xl font-bold text-blue-400">
                {parseFloat(revResult.bacMl.toFixed(2))} mL
              </p>
              <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-0.5 text-xs text-gray-400">
                <p>Each dose = {revTargetUnits} units = {parseFloat(revResult.volumeMl.toFixed(3))} mL</p>
                <p>Concentration: {parseFloat((revResult.concMgMl * 1000).toFixed(1))} mcg/mL</p>
                <p>Doses per vial: {fmtDoses(revResult.dosesPerVial)}</p>
              </div>
            </ResultBox>
          )}
        </Card>

        {/* ── 3. Blend ───────────────────────────────────────────────────────── */}
        <Card>
          <SectionTitle
            n={3}
            title="Blend reconstitution — per-component breakdown"
            subtitle="For multi-peptide blend vials. Select a preset or enter custom components to see exactly how much of each peptide is in every dose."
          />

          <div>
            <Label>Blend</Label>
            <Select
              value={blendPresetIdx === -1 ? 'custom' : String(blendPresetIdx)}
              onChange={(e) => {
                if (e.target.value === 'custom') setBlendPresetIdx(-1);
                else setBlendPresetIdx(Number(e.target.value));
              }}
            >
              {BLEND_PRESETS.map((p, i) => (
                <option key={i} value={i}>{p.label}</option>
              ))}
              <option value="custom">Custom blend</option>
            </Select>
          </div>

          {isCustomBlend && (
            <div className="space-y-2">
              <Label>Components (enter each peptide's amount in this vial)</Label>
              {customComponents.map((c) => (
                <div key={c.id} className="flex gap-2 items-center">
                  <input
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-green-500"
                    placeholder="Peptide name"
                    value={c.name}
                    onChange={(e) => updateCustomComponent(c.id, 'name', e.target.value)}
                  />
                  <input
                    className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-green-500"
                    placeholder="Amount"
                    inputMode="decimal"
                    value={c.amount}
                    onChange={(e) => updateCustomComponent(c.id, 'amount', e.target.value)}
                  />
                  <select
                    className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-100 focus:outline-none focus:border-green-500"
                    value={c.unit}
                    onChange={(e) => updateCustomComponent(c.id, 'unit', e.target.value)}
                  >
                    <option value="mg">mg</option>
                    <option value="mcg">mcg</option>
                  </select>
                  {customComponents.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeCustomComponent(c.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addCustomComponent}
                className="text-xs text-green-500 hover:text-green-400 transition-colors font-medium"
              >
                + Add component
              </button>
            </div>
          )}

          {activePreset && (
            <div className="flex flex-wrap gap-1.5">
              {activePreset.components.map((c) => (
                <span key={c.name} className="px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-300">
                  {c.name} ({Math.round(c.fraction * 100)}%)
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Total vial (mg)</Label>
              <Input
                type="text" inputMode="decimal"
                value={blendVial} onChange={(e) => setBlendVial(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <Label>BAC water (mL)</Label>
              <Input
                type="text" inputMode="decimal"
                value={blendBac} onChange={(e) => setBlendBac(e.target.value)}
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <Label>Dose (U-100 units)</Label>
              <Input
                type="text" inputMode="decimal"
                value={blendDoseUnits} onChange={(e) => setBlendDoseUnits(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          </div>

          {blendResult && (
            <ResultBox accent="purple">
              <p className="text-xs text-gray-400 mb-1">Per dose breakdown</p>
              <p className="text-2xl font-bold text-purple-400">
                {blendDoseUnits} units
                <span className="text-base font-normal text-gray-400 ml-1">
                  (= {parseFloat(blendResult.volumeMl.toFixed(3))} mL)
                </span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Concentration: {parseFloat(blendResult.concMgMl.toFixed(2))} mg/mL total
              </p>
              <ul className="mt-3 space-y-1">
                {blendResult.perDose.map((c) => (
                  <li key={c.name} className="text-sm text-gray-200">
                    <span className="font-semibold text-gray-100">{c.name}:</span>{' '}
                    {fmtAmount(c.amountMg)}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-700/50">
                Doses per vial: {fmtDoses(blendResult.dosesPerVial)}
              </p>
            </ResultBox>
          )}
        </Card>

        {/* ── 4. Vial Supply ─────────────────────────────────────────────────── */}
        <Card>
          <SectionTitle
            n={4}
            title="Vial supply — how long will my vial last?"
            subtitle="Plan how many vials you'll need for a full cycle based on your dose, dosing frequency, and cycle length."
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vial strength (mg)</Label>
              <Input
                type="text" inputMode="decimal"
                value={supVial} onChange={(e) => setSupVial(e.target.value)}
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <Label>BAC water (mL) <span className="text-gray-600 font-normal normal-case">(optional)</span></Label>
              <Input
                type="text" inputMode="decimal"
                value={supBac} onChange={(e) => setSupBac(e.target.value)}
                placeholder="e.g. 2"
              />
              <p className="text-xs text-gray-600 mt-1">Used to show syringe units per dose</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dose per injection</Label>
              <Input
                type="text" inputMode="decimal"
                value={supDose} onChange={(e) => setSupDose(e.target.value)}
                placeholder="e.g. 250"
              />
            </div>
            <div>
              <Label>Dose unit</Label>
              <Select value={supUnit} onChange={(e) => setSupUnit(e.target.value as DoseUnit)}>
                <option value="mcg">mcg</option>
                <option value="mg">mg</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Doses per week</Label>
            <Input
              type="text" inputMode="decimal"
              value={supDosesPerWeek} onChange={(e) => setSupDosesPerWeek(e.target.value)}
              placeholder="e.g. 7"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { label: 'Daily', value: '7' },
                { label: 'Weekdays', value: '5' },
                { label: 'M/W/F', value: '3' },
                { label: '2×/wk', value: '2' },
                { label: 'Weekly', value: '1' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setSupDosesPerWeek(preset.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    supDosesPerWeek === preset.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Cycle length (weeks)</Label>
            <Input
              type="text" inputMode="decimal"
              value={supCycleWeeks} onChange={(e) => setSupCycleWeeks(e.target.value)}
              placeholder="e.g. 8"
            />
          </div>

          {supResult && (
            <ResultBox accent="green">
              <p className="text-xs text-gray-400 mb-1">Vials needed for full cycle</p>
              <p className="text-3xl font-bold text-green-400">
                {supResult.vialsNeeded} vial{supResult.vialsNeeded !== 1 ? 's' : ''}
              </p>
              <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-0.5 text-xs text-gray-400">
                <p>Doses per vial: <strong className="text-gray-200">{fmtDoses(supResult.dosesPerVial)}</strong></p>
                <p>One vial lasts: <strong className="text-gray-200">{fmtWeeks(supResult.vialDurationWeeks)}</strong> at {supDosesPerWeek}×/week</p>
                <p>Total doses in cycle: <strong className="text-gray-200">{supResult.totalDoses}</strong> ({supDosesPerWeek} × {supCycleWeeks} wk)</p>
                {supResult.syringeUnits !== null && (
                  <p>Each dose = <strong className="text-gray-200">{parseFloat(supResult.syringeUnits.toFixed(1))} units</strong> on a U-100 syringe</p>
                )}
                {supResult.extraDoses > 0 && (
                  <p className="text-green-600">{supResult.vialsNeeded} vials provides ~{supResult.extraDoses} extra dose{supResult.extraDoses !== 1 ? 's' : ''} of buffer.</p>
                )}
              </div>
            </ResultBox>
          )}
        </Card>

        {/* Disclaimer */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/40 px-5 py-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong className="text-gray-500">Note:</strong> These calculators assume a U-100 insulin syringe (100 units = 1 mL).
            All results are for research and informational purposes only. Always verify calculations
            before use. Consult a qualified healthcare professional before beginning any peptide protocol.
          </p>
        </div>

        <div className="text-center pt-2 pb-4">
          <a href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Peptide Guide — Research-backed peptide reference
          </a>
        </div>
      </div>
    </div>
  );
}
