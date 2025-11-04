from django import forms
# Importation simple des modèles, nécessaire pour ModelForm
from .models import LogEntry, Reservation 
from django.contrib.auth.models import User 


# --- Formulaire 1 : Journal de Bord (LogEntry) ---
class LogEntryForm(forms.ModelForm):
    
    class Meta:
        # DOIT ÊTRE L'OBJET PYTHON RÉEL
        model = LogEntry 
        fields = [
            'pilote', 'duree_vol', 'heures_moteur_total', 'aerodrome_depart', 
            'aerodrome_arrivee', 'notes'
        ]
        widgets = { 'notes': forms.Textarea(attrs={'rows': 4}) }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Importation locale pour le queryset, pour briser la boucle
        from .models import CoproprietaireProfile 
        self.fields['pilote'].queryset = CoproprietaireProfile.objects.all()

# --- Formulaire 2 : Réservation ---
class ReservationForm(forms.ModelForm):
    
    class Meta:
        # DOIT ÊTRE L'OBJET PYTHON RÉEL
        model = Reservation
        fields = [
            'coproprietaire', 'date_debut', 'date_fin', 'motif'
        ]
        widgets = {
            'date_debut': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'date_fin': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'motif': forms.Textarea(attrs={'rows': 2}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Importation locale pour le queryset, pour briser la boucle
        from .models import CoproprietaireProfile 
        self.fields['coproprietaire'].queryset = CoproprietaireProfile.objects.all()
