import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("knowledge", "0001_initial"),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="KnowledgeChunk",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("position", models.PositiveIntegerField()),
                ("content", models.TextField()),
                ("embedding", models.JSONField(blank=True, default=list)),
                ("embedding_model", models.CharField(max_length=120)),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chunks",
                        to="knowledge.knowledgedocument",
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="knowledge_chunks",
                        to="organizations.organization",
                    ),
                ),
            ],
            options={
                "ordering": ["position"],
            },
        ),
        migrations.AddConstraint(
            model_name="knowledgechunk",
            constraint=models.UniqueConstraint(
                fields=("document", "position"),
                name="unique_chunk_position_per_document",
            ),
        ),
        migrations.AddIndex(
            model_name="knowledgechunk",
            index=models.Index(
                fields=["organization", "embedding_model"],
                name="chunk_org_model_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="knowledgechunk",
            index=models.Index(
                fields=["document", "position"],
                name="chunk_document_position_idx",
            ),
        ),
    ]
