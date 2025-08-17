// groups.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { 
  Group, 
  GroupUser,
  CreateGroupRequest, 
  ManageGroupMembersRequest,
  User,
  NOTE_CONSTANTS
} from '../model/note.interface';

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
   * Get a specific group by name with member details
   */
  getGroupByName(name: string): Observable<GroupWithDetails> {
    return this.http.get<GroupWithDetails>(`${this.apiUrl}/${encodeURIComponent(name)}`)
      .pipe(
        tap(group => this.selectedGroupSubject.next(group)),
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
   * Manage group members (add/remove specific users) - only for group creators
   */
  manageGroupMembers(request: ManageGroupMembersRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${encodeURIComponent(request.groupName)}/members`, request)
      .pipe(
        tap(() => {
          // Refresh group details to get updated member list
          this.getGroupByName(request.groupName).subscribe();
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get group members
   */
  getGroupMembers(groupName: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/${encodeURIComponent(groupName)}/members`)
      .pipe(
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

  // ==================== SEARCH AND DISCOVERY ====================

  /**
   * Search groups by name
   */
  searchGroups(query: string): Observable<GroupWithDetails[]> {
    if (!query.trim()) {
      return this.allGroups$;
    }

    const params = new HttpParams().set('search', query);
    
    return this.http.get<GroupWithDetails[]>(`${this.apiUrl}/search`, { params })
      .pipe(
        map(groups => groups.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))),
        catchError(this.handleError)
      );
  }

  /**
   * Get popular groups (by member count)
   */
  getPopularGroups(limit: number = 10): Observable<GroupWithDetails[]> {
    const params = new HttpParams()
      .set('sortBy', 'memberCount')
      .set('sortOrder', 'desc')
      .set('limit', limit.toString());

    return this.http.get<GroupWithDetails[]>(`${this.apiUrl}/popular`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get recently created groups
   */
  getRecentGroups(limit: number = 10): Observable<GroupWithDetails[]> {
    const params = new HttpParams()
      .set('sortBy', 'createdAt')
      .set('sortOrder', 'desc')
      .set('limit', limit.toString());

    return this.http.get<GroupWithDetails[]>(`${this.apiUrl}/recent`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Filter groups locally (for immediate UI feedback)
   */
  filterGroupsLocally(groups: GroupWithDetails[], query: string): GroupWithDetails[] {
    if (!query.trim()) return groups;
    
    const lowercaseQuery = query.toLowerCase();
    
    return groups.filter(group => 
      group.name.toLowerCase().includes(lowercaseQuery)
    ).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
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
    
    if (groupData.name && groupData.name.trim().length > NOTE_CONSTANTS.MAX_GROUP_NAME_LENGTH) {
      errors.push(`Group name cannot exceed ${NOTE_CONSTANTS.MAX_GROUP_NAME_LENGTH} characters`);
    }
    
    // Check for invalid characters
    if (groupData.name && !/^[a-zA-Z0-9\s\-_()]+$/.test(groupData.name)) {
      errors.push('Group name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses');
    }
    
    // Check for reserved names
    const reservedNames = ['admin', 'system', 'public', 'private', 'all', 'none'];
    if (groupData.name && reservedNames.includes(groupData.name.toLowerCase().trim())) {
      errors.push('This group name is reserved. Please choose a different name');
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

  // ==================== ROOM/GROUP DISCOVERY ====================

  /**
   * Get groups formatted for dropdown/select
   */
  getGroupsForSelect(): Observable<Array<{ value: string; label: string; memberCount: number }>> {
    return this.userGroups$.pipe(
      map(groups => 
        groups.map(group => ({
          value: group.name,
          label: `${group.name} (${group.memberCount} members)`,
          memberCount: group.memberCount
        }))
      )
    );
  }

  /**
   * Get group suggestions based on current user's activity
   */
  getGroupSuggestions(limit: number = 5): Observable<GroupWithDetails[]> {
    const params = new HttpParams().set('limit', limit.toString());
    
    return this.http.get<GroupWithDetails[]>(`${this.apiUrl}/suggestions`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get trending groups (most active recently)
   */
  getTrendingGroups(limit: number = 10): Observable<GroupWithDetails[]> {
    const params = new HttpParams().set('limit', limit.toString());
    
    return this.http.get<GroupWithDetails[]>(`${this.apiUrl}/trending`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  // ==================== GROUP STATISTICS ====================

  /**
   * Get group statistics
   */
  getGroupStats(groupName: string): Observable<{
    memberCount: number;
    noteCount: number;
    recentActivity: Date | null;
    createdAt: Date;
  }> {
    return this.http.get<{
      memberCount: number;
      noteCount: number;
      recentActivity: Date | null;
      createdAt: Date;
    }>(`${this.apiUrl}/${encodeURIComponent(groupName)}/stats`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get overall groups statistics
   */
  getOverallGroupsStats(): Observable<{
    totalGroups: number;
    totalMembers: number;
    averageMembersPerGroup: number;
    mostPopularGroup: GroupWithDetails | null;
    userGroupsCount: number;
  }> {
    return this.http.get<{
      totalGroups: number;
      totalMembers: number;
      averageMembersPerGroup: number;
      mostPopularGroup: GroupWithDetails | null;
      userGroupsCount: number;
    }>(`${this.apiUrl}/overall-stats`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // ==================== SORTING AND FILTERING ====================

  /**
   * Sort groups locally
   */
  sortGroupsLocally(groups: GroupWithDetails[], sortBy: 'name' | 'memberCount' | 'noteCount', order: 'asc' | 'desc' = 'asc'): GroupWithDetails[] {
    return [...groups].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          break;
        case 'memberCount':
          comparison = a.memberCount - b.memberCount;
          break;
        case 'noteCount':
          comparison = (a.noteCount || 0) - (b.noteCount || 0);
          break;
        default:
          comparison = 0;
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
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
      .substring(0, NOTE_CONSTANTS.MAX_GROUP_NAME_LENGTH);
  }

  /**
   * Generate group avatar color (for UI purposes)
   */
  generateGroupColor(groupName: string): string {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < groupName.length; i++) {
      const char = groupName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to HSL for better color distribution
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 60%, 70%)`;
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

  // ==================== BULK OPERATIONS ====================

  /**
   * Join multiple groups at once
   */
  joinMultipleGroups(groupNames: string[]): Observable<{ joined: string[]; failed: string[] }> {
    return this.http.post<{ joined: string[]; failed: string[] }>(`${this.apiUrl}/bulk-join`, {
      groupNames
    }).pipe(
      tap(result => {
        // Update local state for successfully joined groups
        result.joined.forEach(groupName => {
          this.updateGroupMembershipInState(groupName, true);
        });
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Leave multiple groups at once
   */
  leaveMultipleGroups(groupNames: string[]): Observable<{ left: string[]; failed: string[] }> {
    return this.http.post<{ left: string[]; failed: string[] }>(`${this.apiUrl}/bulk-leave`, {
      groupNames
    }).pipe(
      tap(result => {
        // Update local state for successfully left groups
        result.left.forEach(groupName => {
          this.updateGroupMembershipInState(groupName, false);
        });
      }),
      catchError(this.handleError)
    );
  }

  // ==================== ERROR HANDLING ====================

  /**
   * Handle HTTP errors
   */
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

  /**
   * Quick join group with validation
   */
  quickJoinGroup(groupName: string): Observable<{ success: boolean; message: string }> {
    return this.joinGroup(groupName).pipe(
      map(() => ({ 
        success: true, 
        message: `Successfully joined group "${groupName}"` 
      })),
      catchError(error => of({ 
        success: false, 
        message: error.message || 'Failed to join group' 
      }))
    );
  }

  /**
   * Quick leave group with validation
   */
  quickLeaveGroup(groupName: string): Observable<{ success: boolean; message: string }> {
    return this.leaveGroup(groupName).pipe(
      map(() => ({ 
        success: true, 
        message: `Successfully left group "${groupName}"` 
      })),
      catchError(error => of({ 
        success: false, 
        message: error.message || 'Failed to leave group' 
      }))
    );
  }
}