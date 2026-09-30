from django.db import migrations


ENABLE_SQL = (
    "CREATE EXTENSION IF NOT EXISTS vector",
    "ALTER TABLE knowledge_knowledgechunk ADD COLUMN IF NOT EXISTS embedding_vec vector(128)",
    "CREATE INDEX IF NOT EXISTS knowledge_chunk_embedding_hnsw ON knowledge_knowledgechunk USING hnsw (embedding_vec vector_cosine_ops)",
)

DROP_SQL = (
    "DROP INDEX IF EXISTS knowledge_chunk_embedding_hnsw",
    "ALTER TABLE knowledge_knowledgechunk DROP COLUMN IF EXISTS embedding_vec",
)


def enable_pgvector(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for statement in ENABLE_SQL:
        schema_editor.execute(statement)


def disable_pgvector(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    for statement in DROP_SQL:
        schema_editor.execute(statement)


class Migration(migrations.Migration):
    dependencies = [
        ("knowledge", "0002_knowledgechunk"),
    ]

    operations = [
        migrations.RunPython(enable_pgvector, disable_pgvector),
    ]
