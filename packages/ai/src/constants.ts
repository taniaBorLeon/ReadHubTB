export const EMBEDDING_MODEL = "voyage-4";
export const EMBEDDING_DIMENSIONS = 1024;

// Voyage limita a 128 textos por petición; 96 deja margen y coincide con el
// tamaño de lote usado en la documentación del proveedor para este modelo.
export const EMBEDDING_BATCH_SIZE = 96;

export const CHUNK_MAX_CHARS = 1800;
export const CHUNK_OVERLAP_CHARS = 200;

// Top-K: 5 da suficiente diversidad de fuentes para que un futuro Context
// Builder elija entre ellas sin inflar el contexto del LLM de más (rango
// típico en RAG es 3-8; 5 es un punto medio razonable sin datos reales
// todavía para calibrar empíricamente).
export const DEFAULT_MATCH_COUNT = 5;

// Umbral de similitud coseno: recalibrado empíricamente contra voyage-4
// (0.75 era el valor correcto para OpenAI, pero Voyage produce una escala
// de similitud distinta y más comprimida). Con artículos reales indexados,
// coincidencias genuinamente relevantes puntuaron ~0.47-0.61, mientras que
// contenido no relacionado quedó por debajo de ~0.19 -- 0.35 deja margen de
// sobra a ambos lados de esa brecha. Es el único origen de este umbral,
// compartido por match_article_chunks (SQL), vector-search y
// context-builder; debe volver a calibrarse si cambia el modelo de
// embeddings.
export const DEFAULT_MIN_SIMILARITY = 0.35;

// Context Builder -------------------------------------------------------------

// Cantidad de artículos distintos (no chunks) que entran al contexto final.
// Menor que DEFAULT_MATCH_COUNT a propósito: tras fusionar los chunks
// contiguos de un mismo artículo, 3 fuentes distintas ya dan variedad
// suficiente sin diluir el prompt con demasiadas fuentes de relevancia
// marginal.
export const DEFAULT_MAX_CONTEXT_DOCUMENTS = 3;

// Presupuesto de tamaño del contexto en caracteres (proxy sin dependencias de
// un contador de tokens real, misma heurística ~4 caracteres/token usada en
// embedding.service.ts). ~6000 caracteres ≈ 1500 tokens: deja margen amplio
// para instrucciones + pregunta + respuesta de Claude dentro de una ventana
// de contexto típica, sin acercarse a límites de proveedor.
export const DEFAULT_MAX_CONTEXT_CHARS = 6000;

// Chunks más cortos que esto casi nunca aportan valor como fuente aislada
// (encabezados sueltos, restos de fragmentación) y se descartan en la
// selección.
export const DEFAULT_MIN_CHUNK_LENGTH = 40;

// Chat (Groq) --------------------------------------------------------------

// Modelo por defecto para respuestas fundamentadas en el conocimiento de
// ReadHub. Sobreescribible por variable de entorno (GROQ_MODEL) sin tocar
// código si Groq libera un modelo mejor.
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

// Suficiente para una respuesta fundamentada con citas de fuentes sin
// permitir divagaciones extensas; configurable por llamada si algún caso de
// uso futuro necesita respuestas más largas.
export const GROQ_MAX_TOKENS = 1024;
