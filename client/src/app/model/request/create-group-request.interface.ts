/**
 * Interface for creating a new group - UPDATED: added createdAt for Time Machine
 */
export interface CreateGroupRequest {
  name: string;
  userIds?: string[];
  createdAt?: Date; // Added for Time Machine support
}