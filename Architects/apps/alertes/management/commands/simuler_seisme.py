from django.core.management.base import BaseCommand
from apps.alertes.models import Alerte, SimulationAlerte
from apps.alertes.services import process_simulation

class Command(BaseCommand):
    help = "Simuler un séisme"

    def add_arguments(self, parser):
        parser.add_argument("--mag", type=float, required=True)
        parser.add_argument("--lat", type=float, required=True)
        parser.add_argument("--lon", type=float, required=True)
        parser.add_argument("--epicentre", type=str, default="Atlantique - simulation")
        parser.add_argument("--en_mer", type=int, default=1)

    def handle(self, *args, **options):
        sim = SimulationAlerte.objects.create(
            magnitude=options["mag"],
            latitude=options["lat"],
            longitude=options["lon"],
            epicentre=options["epicentre"],
            en_mer=bool(options["en_mer"]),
        )
        alerte = process_simulation(sim)
        self.stdout.write(self.style.SUCCESS(
            f"Simulation traitée. Alerte #{alerte.id} active={alerte.active}"
        ))