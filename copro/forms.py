from django import forms
from django.contrib.auth.models import User 

# ATTENTION: On ne met AUCUN import de modèle de l'application 'copro' ici.

# --- Formulaire 1 : Journal de Bord (LogEntry) ---
class LogEntryForm(forms.ModelForm):
    
    class Meta:
        # Référence par chaîne (Application.Modèle)
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

    # L'importation de CoproprietaireProfile se fait ici, de manière sûre et locale
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from copro.models import CoproprietaireProfile # Importation locale et sûre
        self.fields['pilote'].queryset = CoproprietaireProfile.objects.all()

# --- Formulaire 2 : Réservation ---
class ReservationForm(forms.ModelForm):
    
    class Meta:
        # Référence par chaîne (Application.Modèle)
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

    # L'importation de CoproprietaireProfile se fait ici, de manière sûre et locale
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from copro.models import CoproprietaireProfile # Importation locale et sûre
        self.fields['coproprietaire'].queryset = CoproprietaireProfile.objects.all()
