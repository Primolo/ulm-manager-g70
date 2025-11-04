from django.views.generic import ListView, CreateView, TemplateView # Ajout de TemplateView
from django.urls import reverse_lazy
from django.utils import timezone # Nécessaire pour la fonction get_queryset()

# --- Imports des modèles et formulaires (Utilisation de l'importation absolue pour stabiliser) ---
from copro.models import Reservation, LogEntry 
from copro.forms import LogEntryForm, ReservationForm 
# --------------------------------------------------------------------------------------------------

# --- Vues du Dashboard ---

# Vue 1 : Affiche la Liste des Réservations (Dashboard)
class ReservationListView(ListView):
    # model = Reservation # Retirer model ici est souvent plus stable
    template_name = 'copro/reservation_list.html'
    context_object_name = 'object_list'

    def get_queryset(self):
        # Récupère et filtre les réservations futures (nécessite timezone)
        return Reservation.objects.filter(date_fin__gte=timezone.now()).order_by('date_debut')

# Vue 2 : Ajout d'une Entrée au Journal de Bord (Carré "Enregistrer un Vol")
class LogEntryCreateView(CreateView):
    model = LogEntry
    form_class = LogEntryForm
    template_name = 'copro/logentry_form.html'
    success_url = reverse_lazy('reservation_list')
    
    # NOTE : La logique pour attribuer le pilote à l'utilisateur connecté peut être ajoutée ici plus tard.

# Vue 3 : Ajout d'une Réservation (Carré "Gérer les Réservations")
class ReservationCreateView(CreateView):
    model = Reservation
    form_class = ReservationForm
    template_name = 'copro/reservation_form.html'
    success_url = reverse_lazy('reservation_list')
