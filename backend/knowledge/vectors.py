from django.db import connection

from .local_ai import EMBEDDING_DIMENSIONS


_vector_ready: bool | None = None


def vector_column_ready() -> bool:
    global _vector_ready
    if _vector_ready is not None:
        return _vector_ready
    if connection.vendor != "postgresql":
        _vector_ready = False
        return False
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'knowledge_knowledgechunk'
              AND column_name = 'embedding_vec'
            """
        )
        _vector_ready = cursor.fetchone() is not None
    return _vector_ready


def write_vectors(chunks) -> None:
    if not vector_column_ready():
        return
    rows = []
    for chunk in chunks:
        embedding = chunk.embedding
        if not isinstance(embedding, list) or len(embedding) != EMBEDDING_DIMENSIONS:
            continue
        rows.append((vector_literal(embedding), str(chunk.id)))
    if not rows:
        return
    with connection.cursor() as cursor:
        cursor.executemany(
            "UPDATE knowledge_knowledgechunk SET embedding_vec = %s::vector WHERE id = %s",
            rows,
        )


def vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(f"{float(value):.6f}" for value in embedding) + "]"


def nearest_chunk_ids(organization_id, embedding: list[float], model: str, limit: int = 30) -> list | None:
    if not vector_column_ready():
        return None
    literal = vector_literal(embedding)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id
            FROM knowledge_knowledgechunk
            WHERE organization_id = %s
              AND embedding_model = %s
              AND embedding_vec IS NOT NULL
            ORDER BY embedding_vec <=> %s::vector
            LIMIT %s
            """,
            [str(organization_id), model, literal, limit],
        )
        return [row[0] for row in cursor.fetchall()]
