import { z } from 'zod';

export const PROTOCOL_VERSION = 3;
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(16), gender: z.enum(['male', 'female']),
  fur: z.enum(['honey', 'cocoa', 'sand']), accessory: z.enum(['orange', 'flower', 'none']),
});
export type Profile = z.infer<typeof profileSchema>;
export const playerIdSchema = z.enum(['p1', 'p2']);
export type PlayerId = z.infer<typeof playerIdSchema>;
export const itemKindSchema = z.enum(['orange', 'seed', 'stone', 'wood', 'fiber', 'clay', 'sand', 'copper', 'iron', 'crystal', 'wheat', 'carrot', 'fish', 'trout', 'pearl']);
export type ItemKind = z.infer<typeof itemKindSchema>;
export const toolKindSchema = z.enum(['axe', 'pickaxe', 'hoe', 'rod', 'copperAxe', 'ironPickaxe']);
export type ToolKind = z.infer<typeof toolKindSchema>;
export const buildingKindSchema = z.enum(['home', 'farm', 'dock', 'workshop', 'cottage', 'greenhouse', 'bakery', 'smithy', 'lodge', 'library', 'inn', 'mill', 'boathouse', 'apothecary', 'observatory', 'teaHouse', 'warehouse', 'pottery', 'bathhouse', 'museum']);
export type BuildingKind = z.infer<typeof buildingKindSchema>;
export const cropKindSchema = z.enum(['wheat', 'carrot']);
export type CropKind = z.infer<typeof cropKindSchema>;
const position = z.number().finite().min(-128).max(128);
const identifier = z.string().min(1).max(48);
const time = z.number().finite().nonnegative();
export const playerSchema = z.object({
  id: playerIdSchema, profile: profileSchema, x: position, z: position, angle: z.number().finite(),
  connected: z.boolean(), ready: z.boolean(), moving: z.boolean(), emoteUntil: time,
  location: z.object({ buildingId: identifier, room: z.number().int().min(0).max(3) }).nullable(),
  tools: z.array(toolKindSchema).max(6),
  fishing: z.object({ biteAt: time, endsAt: time }).nullable(),
  actionAt: time,
});
export type Player = z.infer<typeof playerSchema>;
export const buildingSchema = z.object({ id: identifier, kind: buildingKindSchema, x: position, z: position });
export type Building = z.infer<typeof buildingSchema>;
export const cropSchema = z.object({ id: identifier, kind: cropKindSchema, x: position, z: position, plantedAt: time });
export type Crop = z.infer<typeof cropSchema>;
export const stateSchema = z.object({
  version: z.literal(PROTOCOL_VERSION), phase: z.enum(['lobby', 'playing']), seed: z.number().int().min(0).max(2147483647),
  time, testMode: z.boolean(), players: z.object({ p1: playerSchema.nullable(), p2: playerSchema.nullable() }),
  depleted: z.record(identifier, time).refine(nodes => Object.keys(nodes).length <= 1024, 'Too many depleted resource nodes'),
  inventory: z.record(itemKindSchema, z.number().int().nonnegative().max(9999)),
  buildings: z.array(buildingSchema).max(100), crops: z.array(cropSchema).max(200),
  nextId: z.number().int().nonnegative(), harvests: z.number().int().nonnegative(), catches: z.number().int().nonnegative(),
  notice: z.string().max(180), noticeId: z.number().int().nonnegative(),
});
export type GameState = z.infer<typeof stateSchema>;
export const inputSchema = z.object({ x: z.number().finite().min(-1).max(1), z: z.number().finite().min(-1).max(1) });
export type MoveInput = z.infer<typeof inputSchema>;
export const sandboxCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('craft'), tool: toolKindSchema }),
  z.object({ type: z.literal('build'), kind: buildingKindSchema }),
  z.object({ type: z.literal('plant'), crop: cropKindSchema }),
  z.object({ type: z.literal('dismantle') }),
]);
export type SandboxCommand = z.infer<typeof sandboxCommandSchema>;
export const guestMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), version: z.literal(PROTOCOL_VERSION), profile: profileSchema }),
  z.object({ type: z.literal('ready'), value: z.boolean() }),
  z.object({ type: z.literal('input'), input: inputSchema }),
  z.object({ type: z.literal('interact') }), z.object({ type: z.literal('emote') }),
  ...sandboxCommandSchema.options,
]);
export type GuestMessage = z.infer<typeof guestMessageSchema>;
export const hostMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('state'), state: stateSchema }),
  z.object({ type: z.literal('rejected'), reason: z.string().max(200) }),
]);
export type HostMessage = z.infer<typeof hostMessageSchema>;
