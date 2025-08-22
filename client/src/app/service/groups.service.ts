// groups.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Group, CreateGroupRequest } from '../model/group.interface';
import { User } from '../model/entity/user.interface';

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

/**
 * Interface for group search and filtering
 */
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

@Injectable({
  providedIn: 'root'
})
export class GroupsService {
  private readonly apiUrl = '/api/groups'; // Base API URL
  
  // Reactive state management
  private allGroupsSubject = new BehaviorSubject<GroupWithDetails[]>([]);
  public allGroups$ = this.allGroupsSubject.asObservable();
  
  private userGroupsSubject = new BehaviorSubject<GroupWithDetails[]>([]);
  public userGroups$ = this.userGroupsSubject.asObservable();
  
  private selectedGroupSubject = new BehaviorSubject<GroupWithDetails | null>(null);
  public selectedGroup$ = this.selectedGroupSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ==================== CORE CRUD OPERATIONS ====================

  /**
   * Get all groups (public directory - everyone can see all groups)
   */
  getAllGroups(filters?: GroupFilterParams): Observable<GroupsResponse> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.searchQuery) params = params.set('search', filters.searchQuery);
      if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.offset) params = params.set('offset', filters.offset.toString());
      if (filters.onlyJoined) params = params.set('onlyJoined', 'true');
    }

    return this.http.get<GroupsResponse>(`${this.apiUrl}`, { params })
      .pipe(
        tap(response => {
          // Update local state if this is the first page
          if (!filters?.offset || filters.offset === 0) {
            this.allGroupsSubject.next(response.groups);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get groups where current user is a member
   */
  getUserGroups(): Observable<GroupWithDetails[]> {
    return this.http.get<GroupWithDetails[]>(`${this.apiUrl}/my-groups`)
      .pipe(
        map(groups => groups.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))),
        tap(groups => this.userGroupsSubject.next(groups)),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new group (room)
   */
  createGroup(groupData: CreateGroupRequest): Observable<GroupWithDetails> {
    // Validate before sending
    const validation = this.validateGroup(groupData);
    if (!validation.isValid) {
      return throwError(() => new Error(validation.errors.join(', ')));
    }

    return this.http.post<GroupWithDetails>(`${this.apiUrl}`, groupData)
      .pipe(
        tap(newGroup => {
          // Add to local state (both all groups and user groups since user is creator)
          const currentAllGroups = this.allGroupsSubject.value;
          const currentUserGroups = this.userGroupsSubject.value;
          
          this.allGroupsSubject.next([...currentAllGroups, newGroup]
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
          
          this.userGroupsSubject.next([...currentUserGroups, newGroup]
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Delete a group (only creator can delete)
   */
  deleteGroup(name: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${encodeURIComponent(name)}`)
      .pipe(
        tap(() => {
          // Remove from both local states
          const currentAllGroups = this.allGroupsSubject.value;
          const currentUserGroups = this.userGroupsSubject.value;
          
          this.allGroupsSubject.next(currentAllGroups.filter(g => g.name !== name));
          this.userGroupsSubject.next(currentUserGroups.filter(g => g.name !== name));
          
          // Clear selected group if it's the deleted one
          if (this.selectedGroupSubject.value?.name === name) {
            this.selectedGroupSubject.next(null);
          }
        }),
        catchError(this.handleError)
      );
  }

  // ==================== MEMBER MANAGEMENT ====================

  /**
   * Join a group (add current user as member)
   */
  joinGroup(groupName: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${encodeURIComponent(groupName)}/join`, {})
      .pipe(
        tap(() => {
          // Update local state - add group to user's groups
          this.updateGroupMembershipInState(groupName, true);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Leave a group (remove current user from members)
   */
  leaveGroup(groupName: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${encodeURIComponent(groupName)}/leave`, {})
      .pipe(
        tap(() => {
          // Update local state - remove group from user's groups
          this.updateGroupMembershipInState(groupName, false);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Check if current user is member of a group
   */
  isGroupMember(groupName: string): Observable<boolean> {
    return this.http.get<{ isMember: boolean }>(`${this.apiUrl}/${encodeURIComponent(groupName)}/membership`)
      .pipe(
        map(response => response.isMember),
        catchError(this.handleError)
      );
  }

  // ==================== GROUP VALIDATION ====================

  /**
   * Check if group name already exists
   */
  checkGroupNameExists(name: string): Observable<boolean> {
    const params = new HttpParams().set('name', name);

    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/check-name`, { params })
      .pipe(
        map(response => response.exists),
        catchError(this.handleError)
      );
  }

  /**
   * Validate group data before submission
   */
  validateGroup(groupData: CreateGroupRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Name validation
    if (!groupData.name || groupData.name.trim().length === 0) {
      errors.push('Group name is required');
    }
    
    if (groupData.name && groupData.name.trim().length > 100) {
      errors.push(`Group name cannot exceed ${100} characters`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate group name in real-time (for form validation)
   */
  validateGroupName(name: string): Observable<{ isValid: boolean; errors: string[] }> {
    const localValidation = this.validateGroup({ name });
    
    if (!localValidation.isValid) {
      return of(localValidation);
    }
    
    // Check uniqueness on server
    return this.checkGroupNameExists(name).pipe(
      map(exists => ({
        isValid: !exists,
        errors: exists ? ['A group with this name already exists'] : []
      })),
      catchError(() => {
        // If check fails, allow local validation to pass
        return of({ isValid: true, errors: [] });
      })
    );
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get current user's groups from local state
   */
  getCurrentUserGroups(): GroupWithDetails[] {
    return this.userGroupsSubject.value;
  }

  /**
   * Get all groups from local state
   */
  getCurrentAllGroups(): GroupWithDetails[] {
    return this.allGroupsSubject.value;
  }

  /**
   * Set selected group
   */
  setSelectedGroup(group: GroupWithDetails): void {
    this.selectedGroupSubject.next(group);
  }

  /**
   * Clear selected group
   */
  clearSelectedGroup(): void {
    this.selectedGroupSubject.next(null);
  }

  /**
   * Check if current user is owner of group
   */
  isGroupOwner(group: Group, currentUserId: string): boolean {
    return group.creator === currentUserId;
  }

  /**
   * Check if current user can delete group
   */
  canDeleteGroup(group: Group, currentUserId: string): boolean {
    return this.isGroupOwner(group, currentUserId);
  }

  /**
   * Get user's group names (for permission checks)
   */
  getUserGroupNames(): Observable<string[]> {
    return this.userGroups$.pipe(
      map(groups => groups.map(g => g.name))
    );
  }


  // ==================== STATE MANAGEMENT ====================

  /**
   * Refresh all groups from server
   */
  refreshAllGroups(filters?: GroupFilterParams): Observable<GroupsResponse> {
    return this.getAllGroups(filters);
  }

  /**
   * Refresh user groups from server
   */
  refreshUserGroups(): Observable<GroupWithDetails[]> {
    return this.getUserGroups();
  }

  /**
   * Reset service state
   */
  resetState(): void {
    this.allGroupsSubject.next([]);
    this.userGroupsSubject.next([]);
    this.selectedGroupSubject.next(null);
  }

  /**
   * Initialize groups (call this when user logs in)
   */
  initializeGroups(): Observable<{ allGroups: GroupsResponse; userGroups: GroupWithDetails[] }> {
    const allGroups$ = this.getAllGroups({ limit: 50 });
    const userGroups$ = this.getUserGroups();
    
    return allGroups$.pipe(
      map(allGroupsResponse => ({
        allGroups: allGroupsResponse,
        userGroups: this.userGroupsSubject.value
      }))
    );
  }

  /**
   * Update group membership in local state
   */
  private updateGroupMembershipInState(groupName: string, joined: boolean): void {
    const currentAllGroups = this.allGroupsSubject.value;
    const currentUserGroups = this.userGroupsSubject.value;
    
    // Update all groups state
    const updatedAllGroups = currentAllGroups.map(group => {
      if (group.name === groupName) {
        return {
          ...group,
          isMember: joined,
          memberCount: joined ? group.memberCount + 1 : group.memberCount - 1
        };
      }
      return group;
    });
    this.allGroupsSubject.next(updatedAllGroups);
    
    // Update user groups state
    if (joined) {
      const groupToAdd = currentAllGroups.find(g => g.name === groupName);
      if (groupToAdd) {
        const updatedUserGroups = [...currentUserGroups, { ...groupToAdd, isMember: true }]
          .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        this.userGroupsSubject.next(updatedUserGroups);
      }
    } else {
      const filteredUserGroups = currentUserGroups.filter(g => g.name !== groupName);
      this.userGroupsSubject.next(filteredUserGroups);
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Sanitize group name
   */
  sanitizeGroupName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 100);
  }

  /**
   * Get group display name with member count
   */
  getGroupDisplayName(group: GroupWithDetails): string {
    return `${group.name} (${group.memberCount} member${group.memberCount !== 1 ? 's' : ''})`;
  }

  /**
   * Check if group name is available
   */
  isGroupNameAvailable(name: string): Observable<boolean> {
    return this.checkGroupNameExists(name).pipe(
      map(exists => !exists)
    );
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Get groups where user is owner
   */
  getOwnedGroups(): Observable<GroupWithDetails[]> {
    return this.userGroups$.pipe(
      map(groups => groups.filter(group => group.isOwner))
    );
  }

  /**
   * Get groups where user is member but not owner
   */
  getJoinedGroups(): Observable<GroupWithDetails[]> {
    return this.userGroups$.pipe(
      map(groups => groups.filter(group => group.isMember && !group.isOwner))
    );
  }

  /**
   * Get available groups to join (not already a member)
   */
  getAvailableGroups(): Observable<GroupWithDetails[]> {
    return this.allGroups$.pipe(
      map(groups => groups.filter(group => !group.isMember))
    );
  }

    private handleError = (error: any): Observable<never> => {
    console.error('GroupsService Error:', error);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid group data';
          break;
        case 401:
          errorMessage = 'Authentication required';
          break;
        case 403:
          errorMessage = 'Access denied. Only group owners can perform this action';
          break;
        case 404:
          errorMessage = 'Group not found';
          break;
        case 409:
          errorMessage = 'Group name already exists or user already in group';
          break;
        case 422:
          errorMessage = 'Cannot delete group that contains notes or has members';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later';
          break;
        default:
          errorMessage = `HTTP Error ${error.status}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  };
}