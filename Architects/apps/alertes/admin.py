from django.contrib import admin
from .models import Alerte, Sirene, SimulationAlerte

admin.site.register(Alerte)
admin.site.register(Sirene)
admin.site.register(SimulationAlerte)