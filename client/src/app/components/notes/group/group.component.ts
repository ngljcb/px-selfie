import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { GroupsService, GroupWithDetails } from '../../../service/groups.service';
import { CreateGroupRequest } from '../../../model/note.interface';
import { TimeMachineService } from '../../../service/time-machine.service';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group.component.html'
})
export class GroupComponent implements OnInit, OnDestroy {

  // Groups data - single list, sorted
  groups: GroupWithDetails[] = [];
  allGroupsFromServer: GroupWithDetails[] = [];

  // UI states
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Create group form
  showCreateForm = false;
  newGroupName = '';
  creatingGroup = false;

  // Subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private groupsService: GroupsService,
    private router: Router,
    private timeMachineService: TimeMachineService
  ) {}

  ngOnInit(): void {
    this.loadGroups();
    
    // Subscribe to time machine changes to filter groups by creation date
    this.timeMachineService.virtualNow$().pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.filterGroupsByTimeMachine();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== DATA LOADING ==========

  /**
   * Load and sort all groups
   */
  private loadGroups(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.groupsService.getAllGroups().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.allGroupsFromServer = response.groups;
        this.filterGroupsByTimeMachine();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading groups:', error);
        this.errorMessage = 'Error loading groups. Please try again.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Filter groups based on time machine date - UPDATED WITH TIME MACHINE INTEGRATION
   */
  private filterGroupsByTimeMachine(): void {
    if (!this.allGroupsFromServer.length) {
      this.groups = [];
      return;
    }

    // Get current time from time machine (could be virtual)
    const currentTime = this.timeMachineService.getNow();
    
    // Filter groups: only show groups created before or at the current time machine date
    const filteredGroups = this.allGroupsFromServer.filter(group => {
      if (!group.createdAt) {
        // If no creation date, assume it was created "now" for safety
        return true;
      }
      
      const groupCreationDate = new Date(group.createdAt);
      return groupCreationDate <= currentTime;
    });

    this.sortGroups(filteredGroups);
  }

  /**
   * Sort groups: member groups first, then others by name
   */
  private sortGroups(allGroups: GroupWithDetails[]): void {
    this.groups = allGroups.sort((a, b) => {
      // Member groups (owner or member) go first
      if ((a.isOwner || a.isMember) && !(b.isOwner || b.isMember)) return -1;
      if (!(a.isOwner || a.isMember) && (b.isOwner || b.isMember)) return 1;

      // Within same category, sort alphabetically
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }

  // ========== GROUP CREATION ==========

  /**
   * Show create group form
   */
  showCreateGroupForm(): void {
    this.showCreateForm = true;
    this.newGroupName = '';
  }

  /**
   * Hide create group form
   */
  hideCreateGroupForm(): void {
    this.showCreateForm = false;
    this.newGroupName = '';
  }

  /**
   * Create new group - UPDATED WITH TIME MACHINE INTEGRATION
   */
  createGroup(): void {
    if (!this.isGroupNameValid()) {
      return;
    }

    this.creatingGroup = true;

    // UPDATED: Use time machine date for group creation
    const creationDate = this.timeMachineService.getNow();

    const createRequest: CreateGroupRequest = {
      name: this.newGroupName.trim(),
      // Pass the creation date from time machine to backend
      createdAt: creationDate
    };

    this.groupsService.createGroup(createRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (newGroup) => {
        // Add to server data and re-filter
        this.allGroupsFromServer.push(newGroup);
        this.filterGroupsByTimeMachine();

        this.successMessage = `Group "${newGroup.name}" created successfully!`;
        this.hideCreateGroupForm();
        this.clearMessages();
        this.creatingGroup = false;
      },
      error: (error) => {
        console.error('Error creating group:', error);
        this.errorMessage = 'Error creating group. Please try again.';
        this.clearMessages();
        this.creatingGroup = false;
      }
    });
  }

  /**
   * Validate group name
   */
  isGroupNameValid(): boolean {
    return this.newGroupName.trim().length >= 3;
  }

  // ========== GROUP ACTIONS ==========

  /**
   * Join a group
   */
  joinGroup(group: GroupWithDetails): void {
    this.groupsService.joinGroup(group.name).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Update group in lists
        this.updateGroupInLists(group.name, { isMember: true, memberCount: group.memberCount + 1 });

        this.successMessage = `Successfully joined "${group.name}"!`;
        this.clearMessages();
      },
      error: (error) => {
        console.error('Error joining group:', error);
        this.errorMessage = 'Error joining group. Please try again.';
        this.clearMessages();
      }
    });
  }

  /**
   * Leave a group
   */
  leaveGroup(group: GroupWithDetails): void {
    if (!confirm(`Are you sure you want to leave "${group.name}"?`)) {
      return;
    }

    this.groupsService.leaveGroup(group.name).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Update group in lists
        this.updateGroupInLists(group.name, { isMember: false, memberCount: Math.max(0, group.memberCount - 1) });

        this.successMessage = `Left "${group.name}" successfully!`;
        this.clearMessages();
      },
      error: (error) => {
        console.error('Error leaving group:', error);
        this.errorMessage = 'Error leaving group. Please try again.';
        this.clearMessages();
      }
    });
  }

  /**
   * Delete a group (only for owners)
   */
  deleteGroup(group: GroupWithDetails): void {
    if (!group.isOwner) {
      return;
    }

    const confirmMessage = `Are you sure you want to delete "${group.name}"?\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.groupsService.deleteGroup(group.name).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Remove from both lists
        this.allGroupsFromServer = this.allGroupsFromServer.filter(g => g.name !== group.name);
        this.groups = this.groups.filter(g => g.name !== group.name);
        
        this.successMessage = `Group "${group.name}" deleted successfully!`;
        this.clearMessages();
      },
      error: (error) => {
        console.error('Error deleting group:', error);
        this.errorMessage = 'Error deleting group. Please try again.';
        this.clearMessages();
      }
    });
  }

  /**
   * Go back to previous page
   */
  goBack(): void {
    this.router.navigate(['/notes']);
  }

  // ========== HELPER METHODS ==========

  /**
   * Update group in both lists (server and filtered)
   */
  private updateGroupInLists(groupName: string, updates: Partial<GroupWithDetails>): void {
    // Update in server list
    const serverIndex = this.allGroupsFromServer.findIndex(g => g.name === groupName);
    if (serverIndex !== -1) {
      this.allGroupsFromServer[serverIndex] = {
        ...this.allGroupsFromServer[serverIndex],
        ...updates
      };
    }

    // Update in filtered list
    const filteredIndex = this.groups.findIndex(g => g.name === groupName);
    if (filteredIndex !== -1) {
      this.groups[filteredIndex] = {
        ...this.groups[filteredIndex],
        ...updates
      };
    }

    // Re-sort groups
    this.sortGroups(this.groups);
  }

  /**
   * Get button text for group action
   */
  getActionButtonText(group: GroupWithDetails): string {
    // FIXED: If user is owner, no join/leave button should be shown
    if (group.isOwner) {
      return ''; // No action button for owners
    } else if (group.isMember) {
      return 'Leave';
    } else {
      return 'Join';
    }
  }

  /**
   * Get button class for group action
   */
  getActionButtonClass(group: GroupWithDetails): string {
    if (group.isMember && !group.isOwner) {
      return 'px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium';
    } else {
      return 'px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm font-medium';
    }
  }

  /**
   * Handle group action click
   */
  handleGroupAction(group: GroupWithDetails): void {
    // FIXED: Owners cannot join/leave their own group
    if (group.isOwner) {
      return; // Do nothing for owners
    }

    if (group.isMember) {
      this.leaveGroup(group);
    } else {
      this.joinGroup(group);
    }
  }

  /**
   * Check if group can be deleted
   */
  canDeleteGroup(group: GroupWithDetails): boolean {
    return group.isOwner;
  }

  /**
   * FIXED: Check if user should see join/leave button
   */
  shouldShowActionButton(group: GroupWithDetails): boolean {
    return !group.isOwner; // Hide join/leave button for owners
  }

  /**
   * Check if user is member of group
   */
  isMemberOfGroup(group: GroupWithDetails): boolean {
    return group.isOwner || group.isMember;
  }

  /**
   * Get group status text
   */
  getGroupStatusText(group: GroupWithDetails): string {
    if (group.isOwner) {
      return 'Owner';
    } else if (group.isMember) {
      return 'Member';
    } else {
      return '';
    }
  }

  /**
   * Clear success/error messages after delay
   */
  private clearMessages(): void {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3000);
  }

  /**
   * Track by function for ngFor optimization
   */
  trackByGroupName(index: number, group: GroupWithDetails): string {
    return group.name;
  }

  /**
   * Check if there are no groups at all (considering time machine filter)
   */
  hasNoGroups(): boolean {
    return !this.isLoading && this.groups.length === 0;
  }

  /**
   * Get current time from time machine for display purposes
   */
  getCurrentTimeMachineDate(): string {
    const currentTime = this.timeMachineService.getNow();
    return currentTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Check if time machine is active (for debugging/display)
   */
  isTimeMachineActive(): boolean {
    return this.timeMachineService.isActive();
  }

  /**
   * Get filtered groups count message
   */
  getGroupsCountMessage(): string {
    const visibleCount = this.groups.length;
    const totalCount = this.allGroupsFromServer.length;
    
    if (this.isTimeMachineActive() && visibleCount < totalCount) {
      return `Showing ${visibleCount} of ${totalCount} groups (filtered by time machine date)`;
    } else {
      return `${visibleCount} group${visibleCount !== 1 ? 's' : ''} available`;
    }
  }
}