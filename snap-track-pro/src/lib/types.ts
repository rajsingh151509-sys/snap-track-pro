export type Role = 'parent' | 'kid';

export interface User {
  id: string;
  role: Role;
  email: string | null;
  username: string | null;
  parent_id: string | null;
  name: string;
  age: number | null;
  gender: 'male' | 'female' | null;
  height_cm: number | null;
  weight_kg: number | null;
  color: string;
  calorie_goal: number;
  water_goal_ml: number;
  protein_goal: number;
  is_athlete: boolean;
  created_at: string;
}

export interface PublicUser {
  id: string;
  role: Role;
  name: string;
  username: string | null;
  email: string | null;
  age: number | null;
  gender: 'male' | 'female' | null;
  height_cm: number | null;
  weight_kg: number | null;
  color: string;
  calorie_goal: number;
  water_goal_ml: number;
  protein_goal: number;
  is_athlete: boolean;
}

export interface Entry {
  id: string;
  user_id: string;
  type: 'food' | 'water';
  ts: string;
  food_name: string | null;
  calories: number | null;
  protein_g: number | null;
  notes: string | null;
  confidence: 'low' | 'medium' | 'high' | null;
  ml: number | null;
}

export interface AnalyzeResult {
  food: string;
  calories: number;
  protein_g: number;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    username: u.username,
    email: u.email,
    age: u.age,
    gender: u.gender,
    height_cm: u.height_cm,
    weight_kg: u.weight_kg,
    color: u.color,
    calorie_goal: u.calorie_goal,
    water_goal_ml: u.water_goal_ml,
    protein_goal: u.protein_goal,
    is_athlete: u.is_athlete,
  };
}
