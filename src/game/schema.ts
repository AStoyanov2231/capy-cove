import { z } from 'zod';

export const PROTOCOL_VERSION = 4;
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(16), gender: z.enum(['male', 'female']),
  fur: z.enum(['honey', 'cocoa', 'sand']), accessory: z.enum(['orange', 'flower', 'none']),
});
export type Profile = z.infer<typeof profileSchema>;
export const playerIdSchema = z.enum(['p1', 'p2']);
export type PlayerId = z.infer<typeof playerIdSchema>;
export const itemKindSchema = z.enum(['orange', 'seed', 'stone', 'wood', 'fiber', 'clay', 'sand', 'copper', 'iron', 'crystal', 'wheat', 'carrot', 'fish', 'trout', 'pearl', 'copperBar', 'ironBar', 'copperHead', 'ironHead', 'copperBlank', 'ironBlank', 'hook', 'net']);
export type ItemKind = z.infer<typeof itemKindSchema>;
export const toolKindSchema = z.enum(['axe', 'pickaxe', 'hoe', 'rod', 'copperAxe', 'ironPickaxe', 'fishingKit']);
export type ToolKind = z.infer<typeof toolKindSchema>;
export const buildingKindSchema = z.enum(['home', 'farm', 'dock', 'greenhouse', 'smithy', 'observatory']);
export type BuildingKind = z.infer<typeof buildingKindSchema>;
export const rotationSchema = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);
export type Rotation = z.infer<typeof rotationSchema>;
export const cropKindSchema = z.enum(['wheat', 'carrot']);
export type CropKind = z.infer<typeof cropKindSchema>;
export const recipeIdSchema = z.enum(['smeltCopper', 'smeltIron', 'shapeCopper', 'shapeIron', 'assembleAxe', 'assemblePickaxe', 'finishAxe', 'finishPickaxe', 'makeHook', 'weaveNet', 'assembleFishingKit', 'repairFishingKit', 'reworkNet']);
export type RecipeId = z.infer<typeof recipeIdSchema>;
export const constellationIdSchema = z.enum(['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']);
export type ConstellationId = z.infer<typeof constellationIdSchema>;
const position = z.number().finite().min(-128).max(128);
const identifier = z.string().min(1).max(48);
const time = z.number().finite().nonnegative();
const amount = z.number().int().nonnegative().max(9999);
export const stockSchema = z.partialRecord(itemKindSchema, amount);
export const playerSchema = z.object({
  id: playerIdSchema, profile: profileSchema, x: position, z: position, angle: z.number().finite(),
  connected: z.boolean(), ready: z.boolean(), moving: z.boolean(), emoteUntil: time,
  location: z.object({ buildingId: identifier, room: z.literal(0) }).nullable(),
  tools: z.array(toolKindSchema).max(7), fishingGearWear: z.number().int().min(0).max(12),
  fishing: z.object({ biteAt: time, endsAt: time }).nullable(),
  resting: identifier.nullable(),
  sky: z.object({ furnitureId: identifier, x: z.number().min(0).max(1), y: z.number().min(0).max(1), target: constellationIdSchema.nullable(), alignedAt: time }).nullable(),
  actionAt: time,
});
export type Player = z.infer<typeof playerSchema>;
export const productionJobSchema = z.object({ id: identifier, stationId: identifier, recipe: recipeIdSchema, owner: playerIdSchema, remaining: z.number().finite().min(0).max(60), ready: z.boolean() });
export type ProductionJob = z.infer<typeof productionJobSchema>;
export const indoorPlotSchema = z.object({ furnitureId: identifier, kind: cropKindSchema, plantedAt: time });
export const buildingSchema = z.object({ id: identifier, kind: buildingKindSchema, x: position, z: position, rotation: rotationSchema, storage: stockSchema, jobs: z.array(productionJobSchema).max(16), plots: z.array(indoorPlotSchema).max(8) });
export type Building = z.infer<typeof buildingSchema>;
export const cropSchema = z.object({ id: identifier, kind: cropKindSchema, x: position, z: position, plantedAt: time });
export type Crop = z.infer<typeof cropSchema>;
export const stateSchema = z.object({
  version: z.literal(PROTOCOL_VERSION), phase: z.enum(['lobby', 'playing']), seed: z.number().int().min(0).max(2147483647),
  time, dayOffset: time, discoveries: z.array(constellationIdSchema).max(12), testMode: z.boolean(), players: z.object({ p1: playerSchema.nullable(), p2: playerSchema.nullable() }),
  depleted: z.record(identifier, time).refine(nodes => Object.keys(nodes).length <= 1024, 'Too many depleted resource nodes'),
  inventory: z.record(itemKindSchema, amount), buildings: z.array(buildingSchema).max(100), crops: z.array(cropSchema).max(200),
  nextId: z.number().int().nonnegative(), harvests: z.number().int().nonnegative(), catches: z.number().int().nonnegative(),
  notice: z.string().max(180), noticeId: z.number().int().nonnegative(),
});
export type GameState = z.infer<typeof stateSchema>;
export const inputSchema = z.object({ x: z.number().finite().min(-1).max(1), z: z.number().finite().min(-1).max(1) });
export type MoveInput = z.infer<typeof inputSchema>;
export const sandboxCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('craft'), tool: toolKindSchema }),
  z.object({ type: z.literal('build'), kind: buildingKindSchema, rotation: rotationSchema }),
  z.object({ type: z.literal('plant'), crop: cropKindSchema }),
  z.object({ type: z.literal('dismantle') }),
  z.object({ type: z.literal('produce'), stationId: identifier, recipe: recipeIdSchema }),
  z.object({ type: z.literal('collect'), stationId: identifier, jobId: identifier }),
  z.object({ type: z.literal('transfer'), furnitureId: identifier, direction: z.enum(['deposit', 'withdraw']), item: itemKindSchema, amount: z.number().int().min(1).max(9999) }),
  z.object({ type: z.literal('plot'), furnitureId: identifier, action: z.enum(['plant', 'harvest']), crop: cropKindSchema }),
  z.object({ type: z.literal('aim'), x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1) }),
  z.object({ type: z.literal('record'), constellation: constellationIdSchema }),
  z.object({ type: z.literal('stop-use') }),
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
