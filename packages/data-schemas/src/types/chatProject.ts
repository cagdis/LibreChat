import type { Document, Types } from 'mongoose';

export type ChatProjectMemberRole = 'viewer' | 'editor';

export interface IChatProjectMember {
  userId: string;
  role: ChatProjectMemberRole;
}

export interface IChatProject {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  user: string;
  /** Spike MVP: system-prompt instructions for chats in this project. */
  instructions?: string;
  /** Spike MVP: project context file IDs. */
  fileIds?: string[];
  /** Spike MVP: membership grants (owner implied, not listed). */
  members?: IChatProjectMember[];
  conversationCount: number;
  lastConversationAt?: Date | null;
  lastConversationId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  tenantId?: string;
}

export interface IChatProjectDocument extends Omit<IChatProject, '_id'>, Document {}
