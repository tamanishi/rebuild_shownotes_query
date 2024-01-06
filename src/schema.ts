import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const episodes = sqliteTable("Episodes", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    link: text("link").notNull(),
    pubDate: text("pubDate").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }),
});

export const shownotes = sqliteTable("Shownotes", {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    episodeId: integer("episodeId").notNull().references(() => episodes.id),
    title: text("title").notNull(),
    link: text("link").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }),
});
