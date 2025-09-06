export interface Event {
  id: number;
  user_id: string;
  title: string;
  place: string;
  start_date: string;       // formato YYYY-MM-DD
  end_date: string;         // formato YYYY-MM-DD
  start_time: string;       // formato HH:mm:ss
  end_time: string;         // formato HH:mm:ss
  days_recurrence: string;  // es. "Monday,Tuesday"
  recurrence_type: 'giorniSettimana' | 'numeroFisso' | 'scadenza' | 'indeterminato';
  number_recurrence: number;
  due_date: string;         // formato YYYY-MM-DD
  created_at: string;       // ISO timestamp
}