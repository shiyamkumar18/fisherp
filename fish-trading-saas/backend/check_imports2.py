import os
import sys

# Mock dotenv
import sys
import types
module = types.ModuleType('dotenv')
module.load_dotenv = lambda *args, **kwargs: None
sys.modules['dotenv'] = module

sys.path.insert(0, os.path.abspath('.'))

import config.settings

import importlib
for app in config.settings.INSTALLED_APPS:
    try:
        importlib.import_module(app)
    except Exception as e:
        print(f"Error importing app {app}: {e}")

try:
    importlib.import_module(config.settings.ROOT_URLCONF)
except Exception as e:
    print(f"Error importing ROOT_URLCONF: {e}")

