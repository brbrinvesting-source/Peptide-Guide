export type GoalType =
  | 'weight-loss'
  | 'visceral-fat-loss'
  | 'muscle-gain'
  | 'testosterone'
  | 'healing'
  | 'joints-pain'
  | 'skin'
  | 'mental'
  | 'sexual'
  | 'anti-aging'
  | 'immune'
  | 'sleep'
  | 'energy'
  | 'cardiovascular'
  | 'hair'
  | 'gut-health'
  | 'longevity';

export type PeptideCategory =
  | 'gh-secretagogue'
  | 'healing'
  | 'weight-loss'
  | 'cognitive'
  | 'sexual-health'
  | 'immune'
  | 'anti-aging'
  | 'skin'
  | 'hormonal'
  | 'metabolic'
  | 'sarm'
  | 'blend'
  | 'antimicrobial'
  | 'cardiovascular'
  | 'mitochondrial'
  | 'nootropic'
  | 'sleep'
  | 'antioxidant';

export type AdminRoute =
  | 'subcutaneous'
  | 'intramuscular'
  | 'intranasal'
  | 'oral'
  | 'topical'
  | 'sublingual'
  | 'intravenous';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface DosingInfo {
  typical: string;
  range?: string;
  frequency: string;
  route: AdminRoute[];
  cycleLength: string;
  breakLength?: string;
  timing?: string;
  notes?: string;
  loading?: string;
}

export interface StackEntry {
  id: string;
  reason: string;
}

export interface StackInfo {
  synergistic: StackEntry[];
  redundant: StackEntry[];
  complementary: StackEntry[];
}

export interface Peptide {
  id: string;
  name: string;
  aliases?: string[];
  categories: PeptideCategory[];
  description: string;
  mechanism: string;
  primaryBenefits: string[];
  sideEffects: string[];
  dosing: DosingInfo;
  goals: GoalType[];
  stacks: StackInfo;
  halfLife?: string;
  storage: string;
  reconstitution?: string;
  researchNotes?: string;
  experienceLevel: ExperienceLevel;
  isBlend?: boolean;
  blendComponents?: string[];
}

export interface TitrationStep {
  date: string;
  dose: string;
}

export interface CycleEntry {
  peptideId: string;
  doseMcg: number;
  doseUnit: 'mcg' | 'mg' | 'IU' | 'mg/kg';
  frequency: string;
  route: AdminRoute;
  startDate: string;
  endDate: string;
  notes?: string;
  vialSize?: number;
  vialWaterMl?: number;
  titration?: TitrationStep[];
}

export interface Cycle {
  id: string;
  name: string;
  goal: string;
  entries: CycleEntry[];
  breakAfterWeeks?: number;
  notes?: string;
  createdAt: string;
  logs: DoseLog[];
}

export interface DoseLog {
  date: string;
  peptideId: string;
  dose: number;
  doseUnit: string;
  taken: boolean;
  notes?: string;
}

export const GOAL_LABELS: Record<GoalType, string> = {
  'weight-loss': 'Weight Loss',
  'visceral-fat-loss': 'Visceral Fat Loss',
  'muscle-gain': 'Muscle Gain',
  'testosterone': 'Testosterone Support',
  'healing': 'Healing & Recovery',
  'joints-pain': 'Joints & Muscle Pain',
  'skin': 'Skin Health',
  'mental': 'Mental Performance',
  'sexual': 'Sexual Health',
  'anti-aging': 'Anti-Aging',
  'immune': 'Immune Support',
  'sleep': 'Sleep Quality',
  'energy': 'Energy & Endurance',
  'cardiovascular': 'Cardiovascular Health',
  'hair': 'Hair Growth',
  'gut-health': 'Gut Health',
  'longevity': 'Longevity',
};

export const CATEGORY_LABELS: Record<PeptideCategory, string> = {
  'gh-secretagogue': 'GH Secretagogue',
  'healing': 'Healing',
  'weight-loss': 'Weight Loss',
  'cognitive': 'Cognitive',
  'sexual-health': 'Sexual Health',
  'immune': 'Immune',
  'anti-aging': 'Anti-Aging',
  'skin': 'Skin',
  'hormonal': 'Hormonal',
  'metabolic': 'Metabolic',
  'sarm': 'SARM',
  'blend': 'Blend',
  'antimicrobial': 'Antimicrobial',
  'cardiovascular': 'Cardiovascular',
  'mitochondrial': 'Mitochondrial',
  'nootropic': 'Nootropic',
  'sleep': 'Sleep',
  'antioxidant': 'Antioxidant',
};

export const ROUTE_LABELS: Record<AdminRoute, string> = {
  'subcutaneous': 'SubQ',
  'intramuscular': 'Intramuscular',
  'intranasal': 'Intranasal',
  'oral': 'Oral',
  'topical': 'Topical',
  'sublingual': 'Sublingual',
  'intravenous': 'Intravenous',
};
