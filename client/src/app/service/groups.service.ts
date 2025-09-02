import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Group} from '../model/entity/group.interface';
import { CreateGroupRequest } from '../model/request/create-group-request.interface';
import { ErrorHandlerService } from './error-handler.service';
import { GroupWithDetails } from '../model/entity/group.interface';
import { GroupsResponse } from '../model/response/group-response.interface';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class GroupsService {
  private readonly apiUrl = `${environment.API_BASE_URL}/api/groups`;
  
  private allGroupsSubject = new BehaviorSubject<GroupWithDetails[]>([]);
  public allGroups$ = this.allGroupsSubject.asObservable();
  
  private userGroupsSubject = new BehaviorSubject<GroupWithDetails[]>([]);
  public userGroups$ = this.userGroupsSubject.asObservable();
  
  private selectedGroupSubject = new BehaviorSubject<GroupWithDetails | null>(null);
  public selectedGroup$ = this.selectedGroupSubject.asObservable();

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  getAllGroups(): Observable<GroupsResponse> {
    let params = new HttpParams();

    return this.http.get<GroupsResponse>(`${this.apiUrl}`, { params })
      .pipe(
        tap(response => {{
            this.allGroupsSubject.next(response.groups);
          }
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  getUserGroups(): Observable<GroupWithDetails[]> {
    return this.http.get<GroupWithDetails[]>(`${this.apiUrl}/my-groups`)
      .pipe(
        map(groups => groups.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))),
        tap(groups => this.userGroupsSubject.next(groups)),
        catchError(this.errorHandler.handleError)
      );
  }

  createGroup(groupData: CreateGroupRequest): Observable<GroupWithDetails> {

    const validation = this.validateGroup(groupData);
    if (!validation.isValid) {
      return throwError(() => new Error(validation.errors.join(', ')));
    }

    return this.http.post<GroupWithDetails>(`${this.apiUrl}`, groupData)
      .pipe(
        tap(newGroup => {
          const currentAllGroups = this.allGroupsSubject.value;
          const currentUserGroups = this.userGroupsSubject.value;
          
          this.allGroupsSubject.next([...currentAllGroups, newGroup]
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
          
          this.userGroupsSubject.next([...currentUserGroups, newGroup]
            .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  deleteGroup(name: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${encodeURIComponent(name)}`)
      .pipe(
        tap(() => {
          const currentAllGroups = this.allGroupsSubject.value;
          const currentUserGroups = this.userGroupsSubject.value;
          
          this.allGroupsSubject.next(currentAllGroups.filter(g => g.name !== name));
          this.userGroupsSubject.next(currentUserGroups.filter(g => g.name !== name));

          if (this.selectedGroupSubject.value?.name === name) {
            this.selectedGroupSubject.next(null);
          }
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  joinGroup(groupName: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${encodeURIComponent(groupName)}/join`, {})
      .pipe(
        tap(() => {
          this.updateGroupMembershipInState(groupName, true);
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  leaveGroup(groupName: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${encodeURIComponent(groupName)}/leave`, {})
      .pipe(
        tap(() => {
          this.updateGroupMembershipInState(groupName, false);
        }),
        catchError(this.errorHandler.handleError)
      );
  }

  isGroupMember(groupName: string): Observable<boolean> {
    return this.http.get<{ isMember: boolean }>(`${this.apiUrl}/${encodeURIComponent(groupName)}/membership`)
      .pipe(
        map(response => response.isMember),
        catchError(this.errorHandler.handleError)
      );
  }

  checkGroupNameExists(name: string): Observable<boolean> {
    const params = new HttpParams().set('name', name);

    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/check-name`, { params })
      .pipe(
        map(response => response.exists),
        catchError(this.errorHandler.handleError)
      );
  }

  validateGroup(groupData: CreateGroupRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
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

  validateGroupName(name: string): Observable<{ isValid: boolean; errors: string[] }> {
    const localValidation = this.validateGroup({ name });
    
    if (!localValidation.isValid) {
      return of(localValidation);
    }

    return this.checkGroupNameExists(name).pipe(
      map(exists => ({
        isValid: !exists,
        errors: exists ? ['A group with this name already exists'] : []
      })),
      catchError(() => {
        return of({ isValid: true, errors: [] });
      })
    );
  }

  getCurrentUserGroups(): GroupWithDetails[] {
    return this.userGroupsSubject.value;
  }

  getCurrentAllGroups(): GroupWithDetails[] {
    return this.allGroupsSubject.value;
  }

  setSelectedGroup(group: GroupWithDetails): void {
    this.selectedGroupSubject.next(group);
  }

  clearSelectedGroup(): void {
    this.selectedGroupSubject.next(null);
  }

  isGroupOwner(group: Group, currentUserId: string): boolean {
    return group.creator === currentUserId;
  }

  canDeleteGroup(group: Group, currentUserId: string): boolean {
    return this.isGroupOwner(group, currentUserId);
  }

  getUserGroupNames(): Observable<string[]> {
    return this.userGroups$.pipe(
      map(groups => groups.map(g => g.name))
    );
  }

  refreshAllGroups(): Observable<GroupsResponse> {
    return this.getAllGroups();
  }

  refreshUserGroups(): Observable<GroupWithDetails[]> {
    return this.getUserGroups();
  }

  resetState(): void {
    this.allGroupsSubject.next([]);
    this.userGroupsSubject.next([]);
    this.selectedGroupSubject.next(null);
  }

  initializeGroups(): Observable<{ allGroups: GroupsResponse; userGroups: GroupWithDetails[] }> {
    const allGroups$ = this.getAllGroups();
    const userGroups$ = this.getUserGroups();
    
    return allGroups$.pipe(
      map(allGroupsResponse => ({
        allGroups: allGroupsResponse,
        userGroups: this.userGroupsSubject.value
      }))
    );
  }

  private updateGroupMembershipInState(groupName: string, joined: boolean): void {
    const currentAllGroups = this.allGroupsSubject.value;
    const currentUserGroups = this.userGroupsSubject.value;

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

  sanitizeGroupName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, 100);
  }

  getGroupDisplayName(group: GroupWithDetails): string {
    return `${group.name} (${group.memberCount} member${group.memberCount !== 1 ? 's' : ''})`;
  }

  isGroupNameAvailable(name: string): Observable<boolean> {
    return this.checkGroupNameExists(name).pipe(
      map(exists => !exists)
    );
  }

  getOwnedGroups(): Observable<GroupWithDetails[]> {
    return this.userGroups$.pipe(
      map(groups => groups.filter(group => group.isOwner))
    );
  }

  getJoinedGroups(): Observable<GroupWithDetails[]> {
    return this.userGroups$.pipe(
      map(groups => groups.filter(group => group.isMember && !group.isOwner))
    );
  }

  getAvailableGroups(): Observable<GroupWithDetails[]> {
    return this.allGroups$.pipe(
      map(groups => groups.filter(group => !group.isMember))
    );
  }
}