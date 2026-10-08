from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("knowledge", "0003_pgvector"),
    ]

    operations = [
        migrations.AddField(
            model_name="knowledgechunk",
            name="section",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddIndex(
            model_name="knowledgechunk",
            index=models.Index(fields=["organization", "section"], name="chunk_org_section_idx"),
        ),
    ]
