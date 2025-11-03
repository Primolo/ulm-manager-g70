from django.views.generic import ListView, CreateView
from django.urls import reverse_lazy 
from .models import Reservation, LogEntry # Assure-toi que LogEntry est importé
from .forms import LogEntryForm # Assure-toi que LogEntryForm est importé

# La vue du Dashboard / Liste des Réservations
class ReservationListView(ListView):
    template_name = 'copro/reservation_list.html'
    context_object_name = 'object_list' # Renommer pour être standard

    def get_queryset(self):
        # Récupère et filtre les réservations futures
        return Reservation.objects.filter(date_fin__gte=timezone.now()).order_by('date_debut')

# Vue pour le Journal de Bord (sera complétée plus tard)

# Vue pour l'ajout d'une entrée au Journal de Bord
class LogEntryCreateView(CreateView):
    model = LogEntry
    form_class = LogEntryForm
    template_name = 'copro/logentry_form.html'
    
    # Redirige vers la page d'accueil après le succès
    success_url = reverse_lazy('reservation_list')
