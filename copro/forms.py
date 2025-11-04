from django import forms
# Importation unique de User (car il n'est pas dans copro.models)
from django.contrib.auth.models import User 
# NOTE: Nous importons nos modèles ci-dessous, mais pas ici.


# --- Formulaire 1 : Journal de Bord (LogEntry) ---
class LogEntryForm(forms.ModelForm):
    
    class Meta:
        # Référence par CHAÎNE pour éviter la boucle d'importation
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

    # Utilisation d'un import local pour le queryset (méthode la plus stable pour ce scénario)
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from .models import CoproprietaireProfile # Import local stable
        self.fields['pilote'].queryset = CoproprietaireProfile.objects.all()

# --- Formulaire 2 : Réservation ---
class ReservationForm(forms.ModelForm):
    
    class Meta:
        # Référence par CHAÎNE pour éviter la boucle d'importation
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

    # Utilisation d'un import local pour le queryset (méthode la plus stable pour ce scénario)
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from .models import CoproprietaireProfile # Import local stable
        self.fields['coproprietaire'].queryset = CoproprietaireProfile.objects.all()
