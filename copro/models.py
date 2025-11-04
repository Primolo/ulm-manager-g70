from django.db import models
from django.contrib.auth.models import User 

# --- Modèle 1 : Profil des Copropriétaires ---
class CoproprietaireProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    part_proprieté = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, verbose_name="Part de propriété (%)")
    numero_licence = models.CharField(max_length=50, blank=True, null=True, verbose_name="Numéro de Licence ULM")

    def __str__(self):
        return f"Profil de {self.user.username}"
        
# --- Modèle 2 : Réservations ---
class Reservation(models.Model):
    coproprietaire = models.ForeignKey('copro.CopropietaireProfile', on_delete=models.CASCADE, verbose_name="Réservé par")
    date_debut = models.DateTimeField(verbose_name="Début de la réservation")
    date_fin = models.DateTimeField(verbose_name="Fin de la réservation")
    motif = models.TextField(max_length=500, blank=True, null=True, verbose_name="Motif / Destination (Optionnel)")

    def __str__(self):
        return f"Réservation par {self.coproprietaire.user.username}"

    class Meta:
        ordering = ['date_debut']
        verbose_name = "Réservation ULM G70"
        verbose_name_plural = "Réservations ULM G70"

# --- Modèle 3 : LogEntry (Journal de Bord) ---
class LogEntry(models.Model):
    pilote = models.ForeignKey('copro.CopropietaireProfile', on_delete=models.CASCADE, verbose_name="Pilote")
    duree_vol = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="Durée du Vol (h.mm)")
    heures_moteur_total = models.DecimalField(max_digits=7, decimal_places=2, verbose_name="Heures Moteur (Total)")
    date_vol = models.DateTimeField(auto_now_add=True, verbose_name="Date et Heure de l'Enregistrement")
    aerodrome_depart = models.CharField(max_length=50, verbose_name="Aérodrome de Départ")
    aerodrome_arrivee = models.CharField(max_length=50, verbose_name="Aérodrome d'Arrivée")
    notes = models.TextField(blank=True, null=True, verbose_name="Notes (Maintenance, Carburant, Observations)")

    def __str__(self):
        return f"Vol par {self.pilote.user.username}"

    class Meta:
        ordering = ['-date_vol']
        verbose_name = "Entrée Journal de Bord"
        verbose_name_plural = "Journal de Bord"
