import { Grade } from '../entity/grade.model';

export interface GradesListResponse {
  items: Grade[];
  count: number;
  limit: number;
  offset: number;
}