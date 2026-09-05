import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(16),
  gender: z.enum(['male', 'female']),
  fur: z.enum(['honey', 'cocoa', 'sand']),
  accessory: z.enum(['orange', 'flower', 'none']),
});
export type Profile = z.infer<typeof profileSchema>;
export const playerIdSchema = z.enum(['p1', 'p2']);
export type PlayerId = z.infer<typeof playerIdSchema>;
export const itemKindSchema = z.enum(['orange', 'seed', 'stone']);
export type ItemKind = z.infer<typeof itemKindSchema>;
const position = z.number().finite().min(-100).max(100);
export const playerSchema = z.object({
  id: playerIdSchema, profile: profileSchema,
  x: position, z: position, angle: z.number().finite(),
  connected: z.boolean(), ready: z.boolean(), moving: z.boolean(),
  contributions: z.number().int().nonnegative(), emoteUntil: z.number().finite(),
});
export type Player = z.infer<typeof playerSchema>;
export const stateSchema = z.object({
  version: z.literal(1), phase: z.enum(['lobby', 'playing', 'complete']),
  time: z.number().finite().nonnegative(),
  players: z.object({ p1: playerSchema.nullable(), p2: playerSchema.nullable() }),
  collected: z.array(z.string().max(40)).max(100),
  inventory: z.object({ orange: z.number().int().nonnegative().max(30), seed: z.number().int().nonnegative().max(30), stone: z.number().int().nonnegative().max(30) }),
  quest: z.number().int().min(0).max(3),
  activated: z.array(playerIdSchema).max(2),
  notice: z.string().max(180), noticeId: z.number().int().nonnegative(),
});
export type GameState = z.infer<typeof stateSchema>;
export const inputSchema = z.object({ x: z.number().finite().min(-1).max(1), z: z.number().finite().min(-1).max(1) });
export type MoveInput = z.infer<typeof inputSchema>;
export const guestMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), version: z.literal(1), profile: profileSchema }),
  z.object({ type: z.literal('ready'), value: z.boolean() }),
  z.object({ type: z.literal('input'), input: inputSchema }),
  z.object({ type: z.literal('interact') }),
  z.object({ type: z.literal('emote') }),
]);
export type GuestMessage = z.infer<typeof guestMessageSchema>;
export const hostMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('state'), state: stateSchema }),
  z.object({ type: z.literal('rejected'), reason: z.string().max(200) }),
]);
export type HostMessage = z.infer<typeof hostMessageSchema>;
