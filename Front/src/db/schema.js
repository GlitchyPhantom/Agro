import { pgTable, uuid, text, real, jsonb, timestamp } from "drizzle-orm/pg-core";

// ── User Profiles ────────────────────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // matches Supabase auth.users.id
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  state: text("state"),
  district: text("district"),
  preferredLanguage: text("preferred_language").default("en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Disease Detections ───────────────────────────────────────────────────────
export const detections = pgTable("detections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  cropName: text("crop_name").notNull(),
  diseaseName: text("disease_name").notNull(),
  confidence: real("confidence").notNull(),
  imageUrl: text("image_url"),
  topPredictions: jsonb("top_predictions"),
  advisory: jsonb("advisory"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── AI Chat Messages ─────────────────────────────────────────────────────────
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  sender: text("sender").notNull(), // 'user' | 'ai'
  message: text("message").notNull(),
  audioUrl: text("audio_url"),
  language: text("language").default("en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
