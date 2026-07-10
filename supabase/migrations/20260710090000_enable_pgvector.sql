-- Habilita pgvector para soportar almacenamiento y búsqueda de embeddings.
-- Aditivo: no toca ninguna extensión ni tabla existente (pgcrypto sigue igual).
create extension if not exists vector;
