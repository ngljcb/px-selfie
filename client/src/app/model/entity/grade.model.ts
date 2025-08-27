export interface Grade {
  id: number;
  user_id: string;
  year: string;           // es. "2024/2025" o "2025"
  course_name: string;
  cfu: number;
  grade: number;          // voto intero
  date: string;           // ISO timestamp (timestamptz)
  created_at: string;     // ISO timestamp
}