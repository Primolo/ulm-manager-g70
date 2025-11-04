from django.views.generic import ListView, CreateView, View, TemplateView # AJOUTER TemplateView
from django.urls import reverse_lazy
from django.utils import timezone
from django.shortcuts import render 
from django.http import JsonResponse
from datetime import datetime, date

# --- Imports Harmonieux ---
# Modèles
from .models import Reservation, LogEntry 
# Formulairres
from .forms import ReservationForm, LogEntryForm 

# ... (Le reste des vues est correct)

# --- Vues du Dashboard ---

# Vue 1 : Affiche la Liste des Réservations (Dashboard Page d'Accueil)
class ReservationListView(TemplateView): # CHANGEMENT CRITIQUE
    # Retire model = Reservation
    template_name = 'copro/reservation_list.html'
    
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
        # --- CORRECTION CRITIQUE : Utiliser select_related ---
        # Ceci force Django à récupérer le CoproprietaireProfile et l'objet User 
        # en une seule requête SQL, évitant l'erreur 500 si la base est lente ou la liaison incomplète.
        reservations = Reservation.objects.all().select_related('coproprietaire', 'coproprietaire__user')
        # ----------------------------------------------------
        
        events = []
        for reservation in reservations:
            # Assure-toi que la liaison utilisateur existe avant d'essayer d'y accéder
            username = reservation.coproprietaire.user.username if reservation.coproprietaire and reservation.coproprietaire.user else "Inconnu"
            
            events.append({
                'title': f"Réservé par {username}",
                'start': reservation.date_debut.isoformat(), 
                'end': reservation.date_fin.isoformat(),
                'url': reverse_lazy('reservation_add'), 
                'allDay': False
            })
        
        return JsonResponse(events, safe=False)
