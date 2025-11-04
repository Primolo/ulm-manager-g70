from django.contrib import admin

# Nous n'importons plus les modèles directement pour éviter la boucle/NameError.
# Nous utiliserons la référence par chaîne ci-dessous.

# --- Définition des classes d'administration ---

class CoproprietaireProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'part_proprieté', 'numero_licence')

class ReservationAdmin(admin.ModelAdmin):
    list_display = ('coproprietaire', 'date_debut', 'date_fin')
    list_filter = ('coproprietaire',)

class LogEntryAdmin(admin.ModelAdmin):
    list_display = ('pilote', 'date_vol', 'duree_vol', 'heures_moteur_total')
    list_filter = ('pilote',)


# Enregistrement des modèles : on utilise la référence par chaîne pour éviter le NameError.

admin.site.register('copro.CopropietaireProfile', CoproprietaireProfileAdmin)
admin.site.register('copro.Reservation', ReservationAdmin)
admin.site.register('copro.LogEntry', LogEntryAdmin)
