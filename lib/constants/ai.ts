export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

export const CHUNK_MAX_CHARS = 1800;
export const CHUNK_OVERLAP_CHARS = 200;

// Top-K: 5 da suficiente diversidad de fuentes para que un futuro Context
// Builder elija entre ellas sin inflar el contexto del LLM de más (rango
// típico en RAG es 3-8; 5 es un punto medio razonable sin datos reales
// todavía para calibrar empíricamente).
export const DEFAULT_MATCH_COUNT = 5;

// Umbral de similitud coseno: en embeddings de OpenAI, pares de texto
// genuinamente relacionados suelen caer entre ~0.75 y ~0.95; por debajo de
// ~0.7 el resultado suele ser ruido. 0.75 es un piso conservador que filtra
// coincidencias débiles sin descartar contenido relevante formulado de
// forma distinta a la consulta. Debe recalibrarse empíricamente una vez
// existan artículos indexados reales.
export const DEFAULT_MIN_SIMILARITY = 0.75;

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

// Chat (Claude) ----------------------------------------------------------------

// Modelo por defecto para respuestas fundamentadas en el conocimiento de
// ReadHub: Sonnet da el mejor balance calidad/costo/latencia para un asistente
// de preguntas y respuestas sobre un catálogo de artículos.
export const CLAUDE_MODEL = "claude-sonnet-5";

// Suficiente para una respuesta fundamentada con citas de fuentes sin
// permitir divagaciones extensas; configurable por llamada si algún caso de
// uso futuro necesita respuestas más largas.
export const CLAUDE_MAX_TOKENS = 1024;
