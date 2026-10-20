from django.core.management.base import BaseCommand

from core.jobs import QUEUE_KEY, work


class Command(BaseCommand):
    help = "Run background jobs from the Redis queue."

    def handle(self, *args, **options):
        self.stdout.write(f"Watching Redis list {QUEUE_KEY}.")
        work()
