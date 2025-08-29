import type { Category } from "./entity/category.interface";
import type { Group } from "./entity/group.interface";

export enum AccessibilityType {
  PRIVATE = 'private',
  PUBLIC = 'public', 
  AUTHORIZED = 'authorized',
  GROUP = 'group'
}

export enum NoteSortType {
  ALPHABETICAL = 'alphabetical',
  CREATION_DATE = 'creation_date',
  CONTENT_LENGTH = 'content_length'
}

export interface Note {
  id: string;
  creator: string;
  title: string | null;
  text: string | null;
  createdAt: Date;
  category: string | null; 
  accessibility: AccessibilityType;
  groupName: string | null;
}

export interface NoteAuthorizedUser {
  id: string;
  noteId: string;
  userId: string;
  grantedAt: Date;
}

export interface NoteWithDetails extends Note {
  categoryDetails?: Category;
  groupDetails?: Group;
  authorizedUsers?: NoteAuthorizedUser[];
  canEdit?: boolean;
  canDelete?: boolean;
  preview?: string;
  contentLength?: number;
}

export interface CreateNoteRequest {
  title?: string;
  text?: string;
  category?: string;
  accessibility: AccessibilityType;
  groupName?: string;
  authorizedUserIds?: string[];
  createdAt?: Date; 
}

export interface UpdateNoteRequest {
  title?: string;
  text?: string;
  category?: string;
  accessibility?: AccessibilityType;
  groupName?: string;
  authorizedUserIds?: string[];
}

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

export interface NotesResponse {
  notes: NoteWithDetails[];
  total: number;
  hasMore: boolean;
}

export interface DuplicateNoteRequest {
  sourceNoteId: string;
  newTitle?: string;
  accessibility?: AccessibilityType;
  groupName?: string;
  authorizedUserIds?: string[];
  createdAt?: Date; 
}
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

export interface ShareNoteRequest {
  noteId: string;
  userIds: string[];
}

export interface NotePermissions {
  canView: boolean;
  canDelete: boolean;
}

export type NoteOperation = 'create' | 'read' | 'delete' | 'duplicate' | 'share';

export interface NoteValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface BulkNoteOperation {
  operation: 'delete';
  noteIds: string[];
}

export type SortOption = {
  value: string;
  label: string;
  sortBy: NoteSortType;
  sortOrder: 'asc' | 'desc';
};

export const SORT_OPTIONS: SortOption[] = [
  { 
    value: 'alphabetical-asc', 
    label: 'A-Z', 
    sortBy: NoteSortType.ALPHABETICAL, 
    sortOrder: 'asc' 
  },
  { 
    value: 'alphabetical-desc', 
    label: 'Z-A', 
    sortBy: NoteSortType.ALPHABETICAL, 
    sortOrder: 'desc' 
  },
  { 
    value: 'creation_date-desc', 
    label: 'Newest First', 
    sortBy: NoteSortType.CREATION_DATE, 
    sortOrder: 'desc' 
  },
  { 
    value: 'creation_date-asc', 
    label: 'Oldest First', 
    sortBy: NoteSortType.CREATION_DATE, 
    sortOrder: 'asc' 
  },
  { 
    value: 'content_length-asc', 
    label: 'Shortest First', 
    sortBy: NoteSortType.CONTENT_LENGTH, 
    sortOrder: 'asc' 
  },
  { 
    value: 'content_length-desc', 
    label: 'Longest First', 
    sortBy: NoteSortType.CONTENT_LENGTH, 
    sortOrder: 'desc' 
  }
];

export type {Category} from "./entity/category.interface";
export type {Group} from "./entity/group.interface";
