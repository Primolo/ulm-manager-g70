from django import forms
from django.contrib.auth.models import User
# Nous aurons besoin de apps pour charger le modèle de manière sûre.
from django.apps import apps 


# --- Formulaire 1 : Journal de Bord (LogEntry) ---
class LogEntryForm(forms.ModelForm):
    
    class Meta:
        # Référence par chaîne. Django ne tentera pas de charger le modèle ici.
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

    # Le __init__ est exécuté APRÈS le démarrage du serveur, ce qui permet de charger les modèles en sécurité.
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Charger le modèle CoproprietaireProfile de manière sûre
        CopropietaireProfile = apps.get_model('copro', 'CopropietaireProfile')
        self.fields['pilote'].queryset = CoproprietaireProfile.objects.all()

# --- Formulaire 2 : Réservation ---
class ReservationForm(forms.ModelForm):
    
    class Meta:
        # Référence par chaîne
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
        # Charger le modèle CoproprietaireProfile de manière sûre
        CopropietaireProfile = apps.get_model('copro', 'CopropietaireProfile')
        self.fields['coproprietaire'].queryset = CoproprietaireProfile.objects.all()
