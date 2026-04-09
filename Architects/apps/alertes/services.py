from .models import Alerte, Sirene, SimulationAlerte

SEUIL_MAGNITUDE = 6.5

def should_trigger_alert(magnitude: float, en_mer: bool) -> bool:
    return magnitude > SEUIL_MAGNITUDE and en_mer

def activate_sirens():
    Sirene.objects.all().update(statut="actif")

def deactivate_sirens():
    Sirene.objects.all().update(statut="inactif")

def process_simulation(simulation: SimulationAlerte):
    active = should_trigger_alert(simulation.magnitude, simulation.en_mer)

    alerte = Alerte.objects.create(
        magnitude=simulation.magnitude,
        epicentre=simulation.epicentre,
        latitude=simulation.latitude,
        longitude=simulation.longitude,
        en_mer=simulation.en_mer,
        declenchement="auto",
        active=active,
    )

    if active:
        activate_sirens()
    else:
        deactivate_sirens() 

    simulation.traitee = True
    simulation.save(update_fields=["traitee"])
    return alerte