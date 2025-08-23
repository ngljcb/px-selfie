import { GroupWithDetails } from "../entity/group.interface";

export interface GroupsResponse {
  groups: GroupWithDetails[];
  total: number;
  hasMore: boolean;
}