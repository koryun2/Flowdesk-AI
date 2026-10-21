import django.db.models.deletion
import knowledge.models
import uuid
from django.db import migrations, models


def copy_text_notes(apps, schema_editor):
    document_model = apps.get_model("knowledge", "KnowledgeDocument")
    for document in document_model.objects.filter(source_type="text").exclude(content=""):
        if not (document.notes or "").strip():
            document.notes = document.content
            document.save(update_fields=["notes"])


class Migration(migrations.Migration):
    dependencies = [
        ("knowledge", "0005_stored_file"),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="knowledgedocument",
            name="notes",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="knowledgedocument",
            name="summary",
            field=models.TextField(blank=True),
        ),
        migrations.CreateModel(
            name="KnowledgeFile",
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
                ("stored_file", models.FileField(blank=True, max_length=255, upload_to=knowledge.models.knowledge_file_path)),
                ("file_name", models.CharField(max_length=255)),
                ("mime_type", models.CharField(blank=True, max_length=120)),
                ("extracted_text", models.TextField(blank=True)),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="files",
                        to="knowledge.knowledgedocument",
                    ),
                ),
                (
                    "organization",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="knowledge_files",
                        to="organizations.organization",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at"],
                "indexes": [
                    models.Index(fields=["document", "created_at"], name="kfile_document_created_idx"),
                ],
            },
        ),
        migrations.RunPython(copy_text_notes, migrations.RunPython.noop),
    ]
