from django.views.generic import ListView, CreateView
from django.urls import reverse_lazy
from django.utils import timezone
from django.shortcuts import render 

# --- CORRECTION CRITIQUE : IMPORTER LES MODÈLES ---
from .models import Reservation, LogEntry # <--- CETTE LIGNE EST ESSENTIELLE
# --------------------------------------------------

# Imports de tous les formulaires (qui sont corrects)
from .forms import ReservationForm, LogEntryForm 


# --- Vues du Dashboard ---

# Vue 1 : Affiche la Liste des Réservations (Dashboard Page d'Accueil)
class ReservationListView(ListView):
    model = Reservation # Ce modèle est maintenant importé
    template_name = 'copro/reservation_list.html'
    context_object_name = 'object_list'

    def get_queryset(self):
        # Récupère et filtre les réservations futures
        return Reservation.objects.filter(date_fin__gte=timezone.now()).order_by('date_debut')

# Vue 2 : Ajout d'une Entrée au Journal de Bord
class LogEntryCreateView(CreateView):
    model = LogEntry
    form_class = LogEntryForm
    template_name = 'copro/logentry_form.html'
    success_url = reverse_lazy('reservation_list')

# Vue 3 : Ajout d'une Réservation
class ReservationCreateView(CreateView):
    model = Reservation
    form_class = ReservationForm
    template_name = 'copro/reservation_form.html'
    success_url = reverse_lazy('reservation_list')

# Vue 4 : Affiche la liste de toutes les entrées du Journal de Bord
class LogbookListView(ListView):
    model = LogEntry
    template_name = 'copro/logbook_list.html'
    context_object_name = 'logbook_entries' 

    def get_queryset(self):
        # Trie par vols les plus récents (optimisation select_related)
        return LogEntry.objects.all().select_related('pilote').order_by('-date_vol')
