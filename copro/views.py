from django.views.generic import ListView, CreateView, View
from django.urls import reverse_lazy
from django.utils import timezone
from django.shortcuts import render 
from django.http import JsonResponse
from datetime import datetime, date

# 1. IMPORTER LES MODÈLES AVANT LES FORMULAIRES
from .models import Reservation, LogEntry 
# 2. IMPORTER LES FORMULAIRES EN DERNIER
from .forms import ReservationForm, LogEntryForm 

# ... (le reste du code des vues est correct et inchangé)
# ...

# --- Vues du Dashboard ---

# Vue 1 : Affiche la Liste des Réservations (Dashboard Page d'Accueil)
class ReservationListView(ListView):
    model = Reservation
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

# Vue 3 : Ajout d'une Réservation (Carré "Gérer les Réservations")
class ReservationCreateView(CreateView):
    model = Reservation
    form_class = ReservationForm
    template_name = 'copro/reservation_form.html'
    success_url = reverse_lazy('reservation_list')
    
    # --- GESTION DE LA DATE DU CALENDRIER ---
    def get_initial(self):
        # Récupère la date de début si elle est présente dans l'URL (via FullCalendar)
        initial = super().get_initial()
        start_date = self.request.GET.get('start')
        
        if start_date:
            # Assigner la date de début au champ du formulaire
            initial['date_debut'] = start_date
        return initial
    # ------------------------------------------

# Vue 4 : Affiche la liste de toutes les entrées du Journal de Bord
class LogbookListView(ListView):
    model = LogEntry
    template_name = 'copro/logbook_list.html'
    context_object_name = 'logbook_entries' 

    def get_queryset(self):
        # Trie par vols les plus récents (optimisation select_related)
        return LogEntry.objects.all().select_related('pilote').order_by('-date_vol')
        
# Vue 5 : Fournit les données des réservations au format JSON pour FullCalendar
class ReservationJsonFeed(View):
    def get(self, request, *args, **kwargs):
        # Récupère toutes les réservations
        reservations = Reservation.objects.all()
        
        events = []
        for reservation in reservations:
            # FullCalendar utilise 'title', 'start', et 'end'
            events.append({
                'title': f"Réservé par {reservation.coproprietaire.user.username}",
                'start': reservation.date_debut.isoformat(), 
                'end': reservation.date_fin.isoformat(),
                'url': reverse_lazy('reservation_add'), 
                'allDay': False
            })
        
        return JsonResponse(events, safe=False)
