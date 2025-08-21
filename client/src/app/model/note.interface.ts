/**
 * Enum for note accessibility types
 */
export enum AccessibilityType {
  PRIVATE = 'private',
  PUBLIC = 'public', 
  AUTHORIZED = 'authorized',
  GROUP = 'group'
}

/**
 * Enum for note sorting options
 */
export enum NoteSortType {
  ALPHABETICAL = 'alphabetical',
  CREATION_DATE = 'creation_date',
  CONTENT_LENGTH = 'content_length'
}

/**
 * Interface for predefined Category entity (read-only)
 */
export interface Category {
  name: string; // Primary key as per DB schema
}

/**
 * Interface for Group entity - UPDATED with Time Machine integration
 */
export interface Group {
  name: string;
  creator: string | null;
  createdAt?: Date; // Added created_at field for Time Machine filtering
}

/**
 * Interface for Note authorized user
 */
export interface NoteAuthorizedUser {
  id: string;
  noteId: string;
  userId: string;
  grantedAt: Date;
}

/**
 * Main Note interface - UPDATED: removed lastModify
 */
export interface Note {
  id: string;
  creator: string;
  title: string | null;
  text: string | null;
  createdAt: Date;
  category: string | null; // References category.name
  accessibility: AccessibilityType;
  groupName: string | null;
}

/**
 * Extended Note interface with related data for frontend use
 */
export interface NoteWithDetails extends Note {
  categoryDetails?: Category;
  groupDetails?: Group;
  authorizedUsers?: NoteAuthorizedUser[];
  canEdit?: boolean;
  canDelete?: boolean;
  preview?: string;
  contentLength?: number;
}

/**
 * DTO for creating a new note - UPDATED: added createdAt
 */
export interface CreateNoteRequest {
  title?: string;
  text?: string;
  category?: string; // Category name (must exist in DB)
  accessibility: AccessibilityType;
  groupName?: string;
  authorizedUserIds?: string[];
  createdAt?: Date; // Added for Time Machine support
}

/**
 * DTO for updating an existing note - REMOVED: notes are no longer updatable
 * Keeping interface for backward compatibility but it won't be used
 */
export interface UpdateNoteRequest {
  title?: string;
  text?: string;
  category?: string;
  accessibility?: AccessibilityType;
  groupName?: string;
  authorizedUserIds?: string[];
}

/**
 * DTO for note filtering and search - UPDATED: removed lastModify sorting
 */
export interface NoteFilterParams {
  searchQuery?: string;
  categoryName?: string;
  accessibility?: AccessibilityType;
  groupName?: string;
  sortBy?: NoteSortType;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Response interface for paginated notes
 */
export interface NotesResponse {
  notes: NoteWithDetails[];
  total: number;
  hasMore: boolean;
}

/**
 * DTO for duplicating a note
 */
export interface DuplicateNoteRequest {
  sourceNoteId: string;
  newTitle?: string;
  accessibility?: AccessibilityType;
  groupName?: string;
  authorizedUserIds?: string[];
  createdAt?: Date; // Added for Time Machine support
}

/**
 * Interface for note preview display - UPDATED: removed lastModify
 */
export interface NotePreview {
  id: string;
  title: string | null;
  preview: string;
  createdAt: Date;
  categoryName?: string;
  accessibility: AccessibilityType;
  contentLength: number;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Interface for creating a new group - UPDATED: added createdAt for Time Machine
 */
export interface CreateGroupRequest {
  name: string;
  userIds?: string[];
  createdAt?: Date; // Added for Time Machine support
}

/**
 * Interface for user information (minimal)
 */
export interface User {
  id: string;
  email?: string;
  displayName?: string;
}

/**
 * Interface for note sharing/authorization
 */
export interface ShareNoteRequest {
  noteId: string;
  userIds: string[];
}

/**
 * Interface for note access permissions
 */
export interface NotePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
}

/**
 * Utility type for note operations - UPDATED: removed update
 */
export type NoteOperation = 'create' | 'read' | 'delete' | 'duplicate' | 'share';

/**
 * Interface for note statistics (optional, for dashboard)
 */
export interface NoteStats {
  totalNotes: number;
  privateNotes: number;
  publicNotes: number;
  groupNotes: number;
  authorizedNotes: number;
  categoriesCount: number;
  averageNoteLength: number;
}

/**
 * Validation interface for note content
 */
export interface NoteValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Interface for bulk operations on notes - UPDATED: removed changeCategory and changeAccessibility
 */
export interface BulkNoteOperation {
  operation: 'delete';
  noteIds: string[];
}

/**
 * Constants for note functionality
 */
export const NOTE_CONSTANTS = {
  PREVIEW_LENGTH: 200,
  MAX_TITLE_LENGTH: 255,
  MAX_CATEGORY_NAME_LENGTH: 100,
  MAX_GROUP_NAME_LENGTH: 100,
  DEFAULT_PAGE_SIZE: 20
} as const;