# ULMG70_Manager/settings.py (extrait)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # --- AJOUTER CETTE LIGNE ---
    'copro.apps.CoproConfig', 
]
# ULMG70_Manager/settings.py (à la fin)

# Configuration du Déploiement sur Render/Production
import dj_database_url # Nécessite 'dj-database-url' dans requirements.txt (AJOUTE-LE si ce n'est pas fait!)
import os

# Sécurité: La liste des hôtes autorisés (Render va remplir cela avec ton URL)
# Remplacer 'ton-domaine.com' par ton URL Render
ALLOWED_HOSTS = ['*'] # * Pour commencer, puis mieux vaut spécifier l'URL Render

# Configuration de la base de données pour Render (PostgreSQL)
DATABASE_URL = os.environ.get('DATABASE_URL')
db_from_env = dj_database_url.config(default=DATABASE_URL, conn_max_age=500)
DATABASES = {'default': db_from_env}

# IMPORTANT: Sécurité. À remplacer par une vraie clé pour la production
# (Tu peux utiliser un générateur en ligne et stocker la clé sur Render)
SECRET_KEY = os.environ.get('SECRET_KEY', 'default-key-tres-secrete-pour-le-local')

# Configuration des Fichiers Statiques (CSS/JS) pour Render
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'
