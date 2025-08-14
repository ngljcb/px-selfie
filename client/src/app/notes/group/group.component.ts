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

  // Groups data
  myGroups: GroupWithDetails[] = []; // Groups I created
  otherGroups: GroupWithDetails[] = []; // Groups created by others
  recentlyJoinedGroups: string[] = []; // Track recently joined groups

  // UI states
  isLoading = false;
  isCreatingGroup = false;
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
   * Load all groups and separate them
   */
  private loadGroups(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.groupsService.getAllGroups().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.separateGroups(response.groups);
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
   * Separate groups into my groups and others
   */
  private separateGroups(allGroups: GroupWithDetails[]): void {
    this.myGroups = allGroups.filter(group => group.isOwner);
    
    // Sort other groups: recently joined first, then by member count
    this.otherGroups = allGroups
      .filter(group => !group.isOwner)
      .sort((a, b) => {
        // Recently joined groups go first
        const aRecentlyJoined = this.recentlyJoinedGroups.includes(a.name);
        const bRecentlyJoined = this.recentlyJoinedGroups.includes(b.name);
        
        if (aRecentlyJoined && !bRecentlyJoined) return -1;
        if (!aRecentlyJoined && bRecentlyJoined) return 1;
        
        // Then by member count (descending)
        return b.memberCount - a.memberCount;
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
    if (!this.newGroupName.trim()) {
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
        this.myGroups.unshift(newGroup); // Add to top of my groups
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
        // Update local state
        const updatedGroup = { ...group, isMember: true, memberCount: group.memberCount + 1 };
        this.updateGroupInList(updatedGroup);
        
        // Track as recently joined
        this.recentlyJoinedGroups.unshift(group.name);
        
        // Re-sort to show recently joined group at top
        this.separateGroups([...this.myGroups, ...this.otherGroups]);
        
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
        // Update local state
        const updatedGroup = { ...group, isMember: false, memberCount: Math.max(0, group.memberCount - 1) };
        this.updateGroupInList(updatedGroup);
        
        // Remove from recently joined if present
        this.recentlyJoinedGroups = this.recentlyJoinedGroups.filter(name => name !== group.name);
        
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
    const confirmMessage = `Are you sure you want to delete "${group.name}"?\n\nThis action cannot be undone and will remove all group notes.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    this.groupsService.deleteGroup(group.name).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        // Remove from local state
        this.myGroups = this.myGroups.filter(g => g.name !== group.name);
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
   * View group details/notes
   */
  viewGroup(group: GroupWithDetails): void {
    this.router.navigate(['/notes'], { queryParams: { group: group.name } });
  }

  /**
   * Go back to previous page (usually notes view)
   */
  goBack(): void {
    this.router.navigate(['/notes']);
  }

  // ========== HELPER METHODS ==========

  /**
   * Update group in the appropriate list
   */
  private updateGroupInList(updatedGroup: GroupWithDetails): void {
    // Update in my groups if it exists there
    const myGroupIndex = this.myGroups.findIndex(g => g.name === updatedGroup.name);
    if (myGroupIndex !== -1) {
      this.myGroups[myGroupIndex] = updatedGroup;
    }

    // Update in other groups if it exists there
    const otherGroupIndex = this.otherGroups.findIndex(g => g.name === updatedGroup.name);
    if (otherGroupIndex !== -1) {
      this.otherGroups[otherGroupIndex] = updatedGroup;
    }
  }

  /**
   * Check if group was recently joined
   */
  isRecentlyJoined(groupName: string): boolean {
    return this.recentlyJoinedGroups.includes(groupName);
  }

  /**
   * Get group member count display
   */
  getMemberCountDisplay(count: number): string {
    return `${count} member${count !== 1 ? 's' : ''}`;
  }

  /**
   * Get group badge class based on membership
   */
  getGroupBadgeClass(group: GroupWithDetails): string {
    if (group.isOwner) {
      return 'bg-blue-100 text-blue-700 border border-blue-300';
    } else if (group.isMember) {
      return 'bg-green-100 text-green-700 border border-green-300';
    } else {
      return 'bg-gray-100 text-gray-700 border border-gray-300';
    }
  }

  /**
   * Get group status text
   */
  getGroupStatus(group: GroupWithDetails): string {
    if (group.isOwner) {
      return '👑 Owner';
    } else if (group.isMember) {
      return '✅ Member';
    } else {
      return '🚪 Join';
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
    return !this.isLoading && this.myGroups.length === 0 && this.otherGroups.length === 0;
  }

  /**
   * Format group creation date (if available)
   */
  formatDate(date: Date | undefined): string {
    if (!date) return '';
    
    const now = new Date();
    const groupDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - groupDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return groupDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: groupDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  /**
   * Generate group color for visual distinction
   */
  generateGroupColor(groupName: string): string {
    let hash = 0;
    for (let i = 0; i < groupName.length; i++) {
      const char = groupName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 75%)`;
  }

  /**
   * Get action button text
   */
  getActionButtonText(group: GroupWithDetails): string {
    if (group.isOwner) {
      return 'Manage';
    } else if (group.isMember) {
      return 'Leave';
    } else {
      return 'Join';
    }
  }

  /**
   * Handle group action click
   */
  handleGroupAction(group: GroupWithDetails): void {
    if (group.isOwner) {
      this.viewGroup(group);
    } else if (group.isMember) {
      this.leaveGroup(group);
    } else {
      this.joinGroup(group);
    }
  }

}