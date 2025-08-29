import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { GroupsService} from '../../../service/groups.service';
import { CreateGroupRequest } from '../../../model/request/create-group-request.interface';
import { GroupWithDetails } from '../../../model/entity/group.interface';
import { TimeMachineService } from '../../../service/time-machine.service';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group.component.html'
})
export class GroupComponent implements OnInit, OnDestroy {

  groups: GroupWithDetails[] = [];
  allGroupsFromServer: GroupWithDetails[] = [];

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  showCreateForm = false;
  newGroupName = '';
  creatingGroup = false;

  private destroy$ = new Subject<void>();

  constructor(
    private groupsService: GroupsService,
    private router: Router,
    private timeMachineService: TimeMachineService
  ) {}

  ngOnInit(): void {
    this.loadGroups();
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

  private filterGroupsByTimeMachine(): void {
    if (!this.allGroupsFromServer.length) {
      this.groups = [];
      return;
    }

    const currentTime = this.timeMachineService.getNow();
    
    const filteredGroups = this.allGroupsFromServer.filter(group => {
      if (!group.createdAt) {
        return true;
      }
      
      const groupCreationDate = new Date(group.createdAt);
      return groupCreationDate <= currentTime;
    });

    this.sortGroups(filteredGroups);
  }

  private sortGroups(allGroups: GroupWithDetails[]): void {
    this.groups = allGroups.sort((a, b) => {
      if ((a.isOwner || a.isMember) && !(b.isOwner || b.isMember)) return -1;
      if (!(a.isOwner || a.isMember) && (b.isOwner || b.isMember)) return 1;

      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }

  showCreateGroupForm(): void {
    this.showCreateForm = true;
    this.newGroupName = '';
  }

  hideCreateGroupForm(): void {
    this.showCreateForm = false;
    this.newGroupName = '';
  }

  createGroup(): void {
    if (!this.isGroupNameValid()) {
      return;
    }

    this.creatingGroup = true;
    const creationDate = this.timeMachineService.getNow();

    const createRequest: CreateGroupRequest = {
      name: this.newGroupName.trim(),
      createdAt: creationDate
    };

    this.groupsService.createGroup(createRequest).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (newGroup) => {
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

  isGroupNameValid(): boolean {
    return this.newGroupName.trim().length >= 3;
  }

  joinGroup(group: GroupWithDetails): void {
    this.groupsService.joinGroup(group.name).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
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

  leaveGroup(group: GroupWithDetails): void {
    if (!confirm(`Are you sure you want to leave "${group.name}"?`)) {
      return;
    }

    this.groupsService.leaveGroup(group.name).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
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

  goBack(): void {
    this.router.navigate(['/notes']);
  }

  private updateGroupInLists(groupName: string, updates: Partial<GroupWithDetails>): void {
    const serverIndex = this.allGroupsFromServer.findIndex(g => g.name === groupName);
    if (serverIndex !== -1) {
      this.allGroupsFromServer[serverIndex] = {
        ...this.allGroupsFromServer[serverIndex],
        ...updates
      };
    }

    const filteredIndex = this.groups.findIndex(g => g.name === groupName);
    if (filteredIndex !== -1) {
      this.groups[filteredIndex] = {
        ...this.groups[filteredIndex],
        ...updates
      };
    }
    this.sortGroups(this.groups);
  }

  getActionButtonText(group: GroupWithDetails): string {
    if (group.isOwner) {
      return ''; 
    } else if (group.isMember) {
      return 'Leave';
    } else {
      return 'Join';
    }
  }

  getActionButtonClass(group: GroupWithDetails): string {
    if (group.isMember && !group.isOwner) {
      return 'px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-sm font-medium';
    } else {
      return 'px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors text-sm font-medium';
    }
  }

  handleGroupAction(group: GroupWithDetails): void {
    if (group.isOwner) {
      return; 
    }

    if (group.isMember) {
      this.leaveGroup(group);
    } else {
      this.joinGroup(group);
    }
  }

  canDeleteGroup(group: GroupWithDetails): boolean {
    return group.isOwner;
  }

  shouldShowActionButton(group: GroupWithDetails): boolean {
    return !group.isOwner; 
  }

  isMemberOfGroup(group: GroupWithDetails): boolean {
    return group.isOwner || group.isMember;
  }

  getGroupStatusText(group: GroupWithDetails): string {
    if (group.isOwner) {
      return 'Owner';
    } else if (group.isMember) {
      return 'Member';
    } else {
      return '';
    }
  }

  private clearMessages(): void {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3000);
  }

  trackByGroupName(index: number, group: GroupWithDetails): string {
    return group.name;
  }

  hasNoGroups(): boolean {
    return !this.isLoading && this.groups.length === 0;
  }

  getCurrentTimeMachineDate(): string {
    const currentTime = this.timeMachineService.getNow();
    return currentTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  isTimeMachineActive(): boolean {
    return this.timeMachineService.isActive();
  }

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