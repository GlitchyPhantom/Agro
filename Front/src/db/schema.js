import { pgTable, uuid, text, real, jsonb, timestamp, numeric, date } from "drizzle-orm/pg-core";

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

// ── Farm Plots ───────────────────────────────────────────────────────────────
export const farmPlots = pgTable("farm_plots", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  plotName: text("plot_name").notNull(),
  area: numeric("area").notNull(),
  areaUnit: text("area_unit").default("Acres").notNull(),
  crop: text("crop").notNull(),
  sowingDate: date("sowing_date"),
  soilType: text("soil_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Farm Inventory ───────────────────────────────────────────────────────────
export const farmInventory = pgTable("farm_inventory", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  category: text("category").notNull(), // Fungicide, Pesticide, Fertilizer, Insecticide, etc.
  quantity: numeric("quantity").default("0").notNull(),
  unit: text("unit").default("ml").notNull(),
  activeIngredient: text("active_ingredient"),
  expiryDate: date("expiry_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

