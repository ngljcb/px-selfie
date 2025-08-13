export interface Activity {
  id?: number;
  user_id?: string;
  title: string;
  due_date: string;
  status?: string | null;
  finished_at?: string | null;
  created_at?: string;
}