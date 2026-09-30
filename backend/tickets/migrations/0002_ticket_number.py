from django.db import migrations, models


def assign_ticket_numbers(apps, schema_editor):
    Ticket = apps.get_model("tickets", "Ticket")
    organization_ids = Ticket.objects.values_list("organization_id", flat=True).distinct()
    for organization_id in organization_ids:
        number = 1000
        tickets = Ticket.objects.filter(organization_id=organization_id).order_by("created_at", "id")
        for ticket in tickets:
            number += 1
            ticket.number = number
            ticket.save(update_fields=["number"])


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="ticket",
            name="number",
            field=models.PositiveIntegerField(null=True),
        ),
        migrations.RunPython(assign_ticket_numbers, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="ticket",
            name="number",
            field=models.PositiveIntegerField(),
        ),
        migrations.AddConstraint(
            model_name="ticket",
            constraint=models.UniqueConstraint(
                fields=("organization", "number"),
                name="unique_ticket_number_per_org",
            ),
        ),
    ]
