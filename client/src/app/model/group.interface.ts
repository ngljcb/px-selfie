/**
 * Interface for Group entity - UPDATED with Time Machine integration
 */
export interface Group {
  name: string;
  creator: string | null;
  createdAt?: Date; // Added created_at field for Time Machine filtering
}

/**
 * Interface for creating a new group - UPDATED: added createdAt for Time Machine
 */
export interface CreateGroupRequest {
  name: string;
  userIds?: string[];
  createdAt?: Date; // Added for Time Machine support
}