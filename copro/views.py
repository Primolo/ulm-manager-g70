from django.views.generic import ListView, CreateView
from django.urls import reverse_lazy
from django.utils import timezone
from django.shortcuts import render # Nécessaire si tu as des vues basées sur des fonctions

# Imports de tous les modèles et formulaires de l'application 'copro'
# Ceci est l'approche standard et stable pour lier les modules.
from copro.models import Reservation, LogEntry 
from copro.forms import LogEntryForm, ReservationForm 


# --- Vues du Dashboard ---

# Vue 1 : Affiche la Liste des Réservations (Dashboard Page d'Accueil)
class ReservationListView(ListView):
    # model = Reservation # On le laisse hors de la classe pour plus de stabilité
    template_name = 'copro/reservation_list.html'
    context_object_name = 'object_list'

    def get_queryset(self):
        # Récupère et filtre les réservations futures
        return Reservation.objects.filter(date_fin__gte=timezone.now()).order_by('date_debut')

# Vue 2 : Ajout d'une Entrée au Journal de Bord (Carré "Enregistrer un Vol")
class LogEntryCreateView(CreateView):
    model = LogEntry
    form_class = LogEntryForm
    template_name = 'copro/logentry_form.html'
    success_url = reverse_lazy('reservation_list')
    # NOTE: Le pilote sera automatiquement lié à l'utilisateur connecté via le formulaire.

# Vue 3 : Ajout d'une Réservation (Carré "Gérer les Réservations")
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
        # Trie par vols les plus récents
        return LogEntry.objects.all().select_related('pilote').order_by('-date_vol')
