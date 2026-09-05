import { Schema } from 'mongoose';
import type { IChatProjectDocument } from '~/types';

const chatProjectSchema: Schema<IChatProjectDocument> = new Schema<IChatProjectDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    user: {
      type: String,
      required: true,
      index: true,
    },
    /** Spike MVP (project-sharing): custom instructions injected as system
     *  prompt into chats scoped to this project. */
    instructions: {
      type: String,
      default: '',
      trim: true,
      maxlength: 8000,
    },
    /** Spike MVP: file IDs attached as project context (unioned into the
     *  turn's tool file set at send time). */
    fileIds: {
      type: [String],
      default: [],
    },
    /** Spike MVP: membership grants. `viewer` reads/uses; `editor` also edits
     *  instructions/files/members. Graduation path: AclEntry CHAT_PROJECT
     *  principal (see SPEC §3); members array is the walking skeleton. */
    members: {
      type: [
        {
          userId: { type: String, required: true },
          role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
          _id: false,
        },
      ],
      default: [],
    },
    conversationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastConversationAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastConversationId: {
      type: String,
      default: null,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

chatProjectSchema.index({ user: 1, name: 1, _id: 1 });
chatProjectSchema.index({ user: 1, createdAt: -1, _id: -1 });
chatProjectSchema.index({ user: 1, lastConversationAt: -1, _id: -1 });

export default chatProjectSchema;
