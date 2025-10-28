import os

from django.core.wsgi import get_wsgi_application

# Assurez-vous que le nom du module de configuration est bien réglé sur 'ULMG70_Manager.settings'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ULMG70_Manager.settings')

application = get_wsgi_application()
