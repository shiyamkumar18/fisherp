import os
import sys

# Add backend to path
sys.path.insert(0, os.path.abspath('.'))

import config.settings

import importlib
for app in config.settings.INSTALLED_APPS:
    try:
        importlib.import_module(app)
    except ModuleNotFoundError as e:
        print(f"Error importing app {app}: {e}")

try:
    importlib.import_module(config.settings.ROOT_URLCONF)
except Exception as e:
    print(f"Error importing ROOT_URLCONF: {e}")

