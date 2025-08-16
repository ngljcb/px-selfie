// group.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { GroupsService, GroupWithDetails } from '../../service/groups.service';
import { CreateGroupRequest } from '../../model/note.interface';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group.component.html'
})
export class GroupComponent implements OnInit, OnDestroy {

  // Groups data - single list, sorted
  groups: GroupWithDetails[] = [];

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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadGroups();
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
        this.sortGroups(response.groups);
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
   * Create new group
   */
  createGroup(): void {
    if (!this.isGroupNameValid()) {
      return;
    }

    this.creatingGroup = true;

    const createRequest: CreateGroupRequest = {
      name: this.newGroupName.trim()
    };

    this.groupsService.createGroup(createRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (newGroup) => {
        // Add to groups and re-sort
        this.groups.push(newGroup);
        this.sortGroups(this.groups);
        
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
        // Update group in list
        const index = this.groups.findIndex(g => g.name === group.name);
        if (index !== -1) {
          this.groups[index] = { 
            ...group, 
            isMember: true, 
            memberCount: group.memberCount + 1 
          };
          // Re-sort to move joined group to top
          this.sortGroups(this.groups);
        }
        
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
        // Update group in list
        const index = this.groups.findIndex(g => g.name === group.name);
        if (index !== -1) {
          this.groups[index] = { 
            ...group, 
            isMember: false, 
            memberCount: Math.max(0, group.memberCount - 1) 
          };
          // Re-sort to move left group to bottom
          this.sortGroups(this.groups);
        }
        
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
        // Remove from groups list
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
   * Get button text for group action
   */
  getActionButtonText(group: GroupWithDetails): string {
    if (group.isOwner || group.isMember) {
      return 'Leave';
    } else {
      return 'Join';
    }
  }

  /**
   * Get button class for group action
   */
  getActionButtonClass(group: GroupWithDetails): string {
    if (group.isOwner || group.isMember) {
      return 'px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium';
    } else {
      return 'px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm font-medium';
    }
  }

  /**
   * Handle group action click
   */
  handleGroupAction(group: GroupWithDetails): void {
    if (group.isOwner || group.isMember) {
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
   * Check if there are no groups at all
   */
  hasNoGroups(): boolean {
    return !this.isLoading && this.groups.length === 0;
  }
}