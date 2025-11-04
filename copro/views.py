from django.views.generic import ListView, CreateView
from django.urls import reverse_lazy
from django.utils import timezone
from django.shortcuts import render 

# --- NOUVEAUX IMPORTS POUR LE FLUX JSON ---
from django.http import JsonResponse
from django.views import View 
from datetime import datetime, date
# ------------------------------------------

# Imports de l'Application (Vérifié et Stable)
from .models import Reservation, LogEntry 
from .forms import ReservationForm, LogEntryForm 

# --- Vues du Dashboard ---

# Vue 1 : Affiche la Liste des Réservations (Dashboard Page d'Accueil)
# ... (Les classes ReservationListView, LogEntryCreateView, ReservationCreateView, LogbookListView sont ici) ...

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
                # Utilise isoformat() pour le format de date et heure universel requis par JS
                'start': reservation.date_debut.isoformat(), 
                'end': reservation.date_fin.isoformat(),
                # URL de modification (pointe vers le formulaire d'ajout pour l'instant)
                'url': reverse_lazy('reservation_add'), 
                'allDay': False
            })
        
        # 'safe=False' est nécessaire car la liste JSON n'est pas un dictionnaire de haut niveau
        return JsonResponse(events, safe=False)
