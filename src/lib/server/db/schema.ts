import { pgTable, uuid, varchar, integer, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const chatMessages = pgTable(
	'chat_messages',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		parentId: uuid('parent_id'),
		body: varchar('body', { length: 500 }).notNull(),
		likes: integer('likes').default(0).notNull(),
		deviceKey: varchar('device_key', { length: 64 }).notNull(),
		reports: integer('reports').default(0).notNull(),
		isHidden: boolean('is_hidden').default(false).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [index('chat_messages_parent_idx').on(t.parentId), index('chat_messages_created_idx').on(t.createdAt)]
);

export const chatLikes = pgTable(
	'chat_likes',
	{
		messageId: uuid('message_id').notNull(),
		deviceKey: varchar('device_key', { length: 64 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [uniqueIndex('chat_likes_unique').on(t.messageId, t.deviceKey)]
);

export const chatReports = pgTable(
	'chat_reports',
	{
		messageId: uuid('message_id').notNull(),
		deviceKey: varchar('device_key', { length: 64 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [uniqueIndex('chat_reports_unique').on(t.messageId, t.deviceKey)]
);

export const rateWindows = pgTable(
	'rate_windows',
	{
		deviceKey: varchar('device_key', { length: 64 }).notNull(),
		action: varchar('action', { length: 32 }).notNull(),
		count: integer('count').default(1).notNull(),
		windowStart: timestamp('window_start', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [uniqueIndex('rate_windows_unique').on(t.deviceKey, t.action)]
);
