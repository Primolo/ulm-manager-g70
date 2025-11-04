from django import forms
from .models import LogEntry, Reservation, CoproprietaireProfile 
from django.contrib.auth.models import User 

# --- Formulaire 1 : Journal de Bord (LogEntry) ---
class LogEntryForm(forms.ModelForm):
    
    class Meta:
        model = LogEntry 
        fields = ['pilote', 'duree_vol', 'heures_moteur_total', 'aerodrome_depart', 'aerodrome_arrivee', 'notes']
        widgets = { 'notes': forms.Textarea(attrs={'rows': 4}) }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['pilote'].queryset = CoproprietaireProfile.objects.all()

# --- Formulaire 2 : Réservation ---
class ReservationForm(forms.ModelForm):
    
    class Meta:
        model = Reservation
        fields = ['coproprietaire', 'date_debut', 'date_fin', 'motif']
        widgets = {
            'date_debut': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'date_fin': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
            'motif': forms.Textarea(attrs={'rows': 2}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['coproprietaire'].queryset = CoproprietaireProfile.objects.all()
