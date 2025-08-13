import { Activity } from "../activity.model";

export interface ActivitiesListResponse {
  items: Activity[];
  count: number;
  limit: number;
  offset: number;
}