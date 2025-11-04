from django import forms
# ATTENTION : NE PAS IMPORTER LogEntry, Reservation, ou CoproprietaireProfile ICI
from django.contrib.auth.models import User 


# --- Formulaire 1 : Journal de Bord (LogEntry) ---
class LogEntryForm(forms.ModelForm):
    
    class Meta:
        # Référence le modèle par Chaîne pour stabiliser l'initialisation de ModelForm
        model = 'copro.LogEntry' 
        fields = [
            'pilote', 
            'duree_vol', 
            'heures_moteur_total', 
            'aerodrome_depart', 
            'aerodrome_arrivee', 
            'notes'
        ]
        widgets = { 'notes': forms.Textarea(attrs={'rows': 4}) }

    # IMPORTATION LOCALE : Le seul endroit sûr pour importer CoproprietaireProfile
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from .models import CoproprietaireProfile # Import local et stable
        self.fields['pilote'].queryset = CoproprietaireProfile.objects.all()

# --- Formulaire 2 : Réservation ---
class ReservationForm(forms.ModelForm):
    
    class Meta:
        # Référence le modèle par Chaîne
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

    # IMPORTATION LOCALE : Le seul endroit sûr pour importer CoproprietaireProfile
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from .models import CoproprietaireProfile # Import local et stable
        self.fields['coproprietaire'].queryset = CoproprietaireProfile.objects.all()
