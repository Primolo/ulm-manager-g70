
from django.db import models
from django.contrib.auth.models import CopropietaireProfile

# --- Modèle 1 : Profil des Copropriétaires ---
class CopropietaireProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    part_proprieté = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        default=0.00,
        verbose_name="Part de propriété (%)"
    )
    numero_licence = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Numéro de Licence ULM"
    )

    def __str__(self):
        return f"Profil de {self.user.username}"
        
# --- Modèle 2 : Réservations ---
class Reservation(models.Model):
    coproprietaire = models.ForeignKey(
        CopropietaireProfile, 
        on_delete=models.CASCADE, 
        verbose_name="Réservé par"
    )
    date_debut = models.DateTimeField(
        verbose_name="Début de la réservation"
    )
    date_fin = models.DateTimeField(
        verbose_name="Fin de la réservation"
    )
    motif = models.TextField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Motif / Destination (Optionnel)"
    )

    def __str__(self):
        return f"{self.coproprietaire.username} du {self.date_debut.strftime('%d/%m à %Hh%M')}"

    class Meta:
        ordering = ['date_debut']
        verbose_name = "Réservation ULM G70"
        verbose_name_plural = "Réservations ULM G70"
