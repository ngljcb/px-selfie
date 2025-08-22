import { User } from "./user.interface";

export interface Group {
  name: string;
  creator: string | null;
  createdAt?: Date;
}

export interface GroupWithDetails extends Group {
  memberCount: number;
  members?: User[];
  isOwner: boolean;
  isMember: boolean;
  noteCount?: number;
  createdAt?: Date;
}