import type { Category } from "./entity/category.interface";
import type { Group } from "./entity/group.interface";

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

// ==================== NOTE INTERFACES ====================

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
 * Interface for Note authorized user
 */
export interface NoteAuthorizedUser {
  id: string;
  noteId: string;
  userId: string;
  grantedAt: Date;
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
  canDelete: boolean;
}

/**
 * Utility type for note operations - UPDATED: removed update
 */
export type NoteOperation = 'create' | 'read' | 'delete' | 'duplicate' | 'share';

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

export type {Category} from "./entity/category.interface";
export type {Group} from "./entity/group.interface";
