import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { IChatProject } from '~/types';
import { createChatProjectMethods, type ChatProjectMethods } from './chatProject';
import { createModels } from '~/models';

jest.mock('~/config/winston', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

let mongoServer: InstanceType<typeof MongoMemoryServer>;
let methods: ChatProjectMethods;
let modelsToCleanup: string[] = [];

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  const models = createModels(mongoose);
  modelsToCleanup = Object.keys(models);
  Object.assign(mongoose.models, models);
  methods = createChatProjectMethods(mongoose);
  await mongoose.connect(mongoUri);
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  for (const name of modelsToCleanup) {
    delete mongoose.models[name];
  }
});

describe('chat project sharing MVP (spike)', () => {
  const owner = 'owner-1';
  const member = 'member-2';
  const stranger = 'stranger-3';
  let project: IChatProject;

  it('stores instructions and fileIds on create/update', async () => {
    project = await methods.createChatProject(owner, {
      name: 'Eleições',
      instructions: 'Responda como editor de economia.',
      fileIds: ['file_a'],
    });
    expect(project.instructions).toBe('Responda como editor de economia.');
    expect(project.fileIds).toEqual(['file_a']);

    const updated = await methods.updateChatProject(owner, String(project._id), {
      instructions: 'Responda como editor-chefe.',
    });
    expect(updated?.instructions).toBe('Responda como editor-chefe.');
  });

  it('shares view-only with a member; strangers see nothing', async () => {
    const shared = await methods.shareChatProject(
      owner,
      String(project._id),
      member,
      'viewer',
    );
    expect(shared?.members).toEqual([{ userId: member, role: 'viewer' }]);

    const asMember = await methods.getAccessibleChatProject(member, String(project._id));
    expect(asMember?.effectiveRole).toBe('viewer');
    expect(asMember?.instructions).toBe('Responda como editor-chefe.');

    expect(await methods.getAccessibleChatProject(stranger, String(project._id))).toBeNull();
  });

  it('rejects shares from non-owners and self-shares', async () => {
    expect(
      await methods.shareChatProject(stranger, String(project._id), stranger, 'viewer'),
    ).toBeNull();
    expect(await methods.shareChatProject(owner, String(project._id), owner, 'editor')).toBeNull();
  });

  it('upgrades to editor and revokes on unshare', async () => {
    await methods.shareChatProject(owner, String(project._id), member, 'editor');
    expect(
      (await methods.getAccessibleChatProject(member, String(project._id)))?.effectiveRole,
    ).toBe('editor');

    await methods.unshareChatProject(owner, String(project._id), member);
    expect(await methods.getAccessibleChatProject(member, String(project._id))).toBeNull();
  });

  it('lists shared projects for members only', async () => {
    await methods.shareChatProject(owner, String(project._id), member, 'viewer');
    const mine = await methods.listAccessibleChatProjects(member);
    expect(mine.map((p) => String(p._id))).toContain(String(project._id));
    expect(await methods.listAccessibleChatProjects(stranger)).toEqual([]);
    await methods.unshareChatProject(owner, String(project._id), member);
  });

  it('resolves turn context for prompt assembly', async () => {
    await methods.shareChatProject(owner, String(project._id), member, 'viewer');
    const ctx = await methods.resolveProjectContext(member, String(project._id));
    expect(ctx).toEqual({
      instructions: 'Responda como editor-chefe.',
      fileIds: ['file_a'],
      role: 'viewer',
    });
    expect(await methods.resolveProjectContext(stranger, String(project._id))).toBeNull();
    await methods.unshareChatProject(owner, String(project._id), member);
  });
});
