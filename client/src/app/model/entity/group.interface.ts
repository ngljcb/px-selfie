import { User } from "./user.interface";

/**
 * Interface for Group entity - UPDATED with Time Machine integration
 */
export interface Group {
  name: string;
  creator: string | null;
  createdAt?: Date; // Added created_at field for Time Machine filtering
}

/**
 * Extended Group interface with member details and stats
 */
export interface GroupWithDetails extends Group {
  memberCount: number;
  members?: User[];
  isOwner: boolean;
  isMember: boolean;
  noteCount?: number;
  createdAt?: Date;
}

export interface GroupFilterParams {
  searchQuery?: string;
  sortBy?: 'name' | 'memberCount' | 'createdAt' | 'noteCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  onlyJoined?: boolean; // Show only groups user is member of
}

/**
 * Response interface for paginated groups
 */
export interface GroupsResponse {
  groups: GroupWithDetails[];
  total: number;
  hasMore: boolean;
}