import knowledge.models
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("knowledge", "0004_chunk_section"),
    ]

    operations = [
        migrations.AddField(
            model_name="knowledgedocument",
            name="stored_file",
            field=models.FileField(
                blank=True,
                max_length=255,
                upload_to=knowledge.models.knowledge_upload_path,
            ),
        ),
    ]
