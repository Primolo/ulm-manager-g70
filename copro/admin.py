from django.contrib import admin
# Importer tous les modèles de manière simple pour l'Admin
from .models import CoproprietaireProfile, Reservation, LogEntry 

# Enregistrement des modèles pour l'administration.
# La simple présence de ces lignes garantit que l'Admin essaie de les charger.

class CoproprietaireProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'part_proprieté', 'numero_licence')

class ReservationAdmin(admin.ModelAdmin):
    list_display = ('coproprietaire', 'date_debut', 'date_fin')
    list_filter = ('coproprietaire',)

class LogEntryAdmin(admin.ModelAdmin):
    list_display = ('pilote', 'date_vol', 'duree_vol', 'heures_moteur_total')
    list_filter = ('pilote',)


admin.site.register(CopropietaireProfile, CoproprietaireProfileAdmin)
admin.site.register(Reservation, ReservationAdmin)
admin.site.register(LogEntry, LogEntryAdmin)
