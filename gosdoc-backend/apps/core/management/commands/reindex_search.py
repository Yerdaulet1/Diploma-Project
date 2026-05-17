from django.core.management.base import BaseCommand
from apps.core.search import reindex_all


class Command(BaseCommand):
    help = "Reindex all documents and workspaces in MeiliSearch"

    def handle(self, *args, **options):
        self.stdout.write("Reindexing...")
        reindex_all()
        self.stdout.write(self.style.SUCCESS("Done."))
