from django import forms
# ATTENTION: On retire les imports des modèles CoproprietaireProfile, LogEntry, Reservation
# pour éviter la boucle d'importation. On les référence par chaîne.
from django.contrib.auth.models import User 

# --- Formulaire 1 : Journal de Bord (LogEntry) ---
class LogEntryForm(forms.ModelForm):
    
    class Meta:
        # Référence le modèle par chaîne de caractères (Application.Modèle)
        model = 'copro.LogEntry' 
        fields = [
            'pilote', 
            'duree_vol', 
            'heures_moteur_total', 
            'aerodrome_depart', 
            'aerodrome_arrivee', 
            'notes'
        ]
        widgets = {
            'notes': forms.Textarea(attrs={'rows': 4}),
        }

    # Cette méthode nécessite toujours le modèle CoproprietaireProfile
    # Nous allons la rendre plus robuste en important le modèle ici,
    # où Python est plus tolérant à l'importation tardive.
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from copro.models import CoproprietaireProfile # Importation locale et sûre
        self.fields['pilote'].queryset = CoproprietaireProfile.objects.all()

# --- Formulaire 2 : Réservation ---
class ReservationForm(forms.ModelForm):
    
    class Meta:
        # Référence le modèle par chaîne de caractères (Application.Modèle)
        model = 'copro.Reservation'
        fields = [
            'coproprietaire', 
            'date_debut', 
            'date_fin', 
            'motif'
        ]
        widgets = {
            'date_debut': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'date_fin': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'motif': forms.Textarea(attrs={'rows': 2}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from copro.models import CoproprietaireProfile # Importation locale et sûre
        self.fields['coproprietaire'].queryset = CoproprietaireProfile.objects.all()
