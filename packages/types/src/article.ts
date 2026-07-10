import type { Database } from "@readhub/database/types";

export type Article = Database["public"]["Tables"]["articles"]["Row"];
export type ArticleInsert = Database["public"]["Tables"]["articles"]["Insert"];
export type ArticleUpdate = Database["public"]["Tables"]["articles"]["Update"];

export type ArticleView = Database["public"]["Tables"]["views"]["Row"];
export type ArticleLike = Database["public"]["Tables"]["likes"]["Row"];
export type ArticleFavorite = Database["public"]["Tables"]["favorites"]["Row"];

export type ArticleWithStats =
  Database["public"]["Functions"]["list_articles_with_stats"]["Returns"][number];

export type ArticleDetail =
  Database["public"]["Functions"]["get_article_with_stats"]["Returns"][number];
