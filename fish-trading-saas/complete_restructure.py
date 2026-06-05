import os
import shutil
import re

BACKEND_DIR = '/media/odoo/5AAA-AC72/project/fisherp/fish-trading-saas/backend'

APP_DOMAINS = {
    'dashboard': 'business',
    'trading': 'business',
    'health': 'core',
    'voice': 'core',
}

def clean_and_move_apps():
    for app, domain in APP_DOMAINS.items():
        src = os.path.join(BACKEND_DIR, app)
        dest = os.path.join(BACKEND_DIR, domain, app)
        
        # Only proceed if the source folder exists at root
        if os.path.exists(src):
            # If the destination exists (which we know is only a placeholder), remove it first
            if os.path.exists(dest):
                print(f"Removing placeholder destination {dest}...")
                shutil.rmtree(dest)
            
            print(f"Moving {app} from root to {domain}/{app}...")
            shutil.move(src, dest)
        else:
            print(f"Source {src} does not exist. Already moved?")

def setup_apps_config():
    # Update app configs for ALL apps in saas_platform, business, core
    all_apps = {
        'accounts': 'saas_platform',
        'companies': 'saas_platform',
        'permissions': 'saas_platform',
        'saas_admin': 'saas_platform',
        'subscriptions': 'saas_platform',
        'support': 'saas_platform',
        'platform_mgr': 'saas_platform',
        'dashboard': 'business',
        'trading': 'business',
        'health': 'core',
        'voice': 'core',
    }
    
    for app, domain in all_apps.items():
        app_path = os.path.join(BACKEND_DIR, domain, app)
        if not os.path.exists(app_path):
            print(f"App path {app_path} does not exist. Skipping apps.py setup.")
            continue
            
        apps_file = os.path.join(app_path, 'apps.py')
        class_name = "".join([part.capitalize() for part in app.split('_')]) + "Config"
        
        # Always write / overwrite apps.py to ensure correctness
        print(f"Writing/updating apps.py for {domain}.{app}...")
        with open(apps_file, 'w', encoding='utf-8') as f:
            f.write(f"""from django.apps import AppConfig

class {class_name}(AppConfig):
    name = '{domain}.{app}'
    label = '{app}'
""")

def fix_import_syntax_errors():
    print("Fixing syntax errors in imports...")
    # We want to replace things like:
    # "from rest_framework import saas_platform.permissions" -> "from rest_framework import permissions"
    # "from rest_framework import platform.permissions" -> "from rest_framework import permissions"
    # We will search and replace across the backend folder.
    
    for root, dirs, files in os.walk(BACKEND_DIR):
        if any(p in root for p in ['.venv', 'node_modules', '__pycache__', '.pytest_cache']):
            continue
        for file in files:
            if not file.endswith('.py'):
                continue
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            new_content = content
            
            # Pattern: from rest_framework import ... saas_platform.permissions ...
            # Let's replace any instance of (saas_platform|platform).permissions with permissions in rest_framework imports
            lines = new_content.split('\n')
            modified = False
            for idx, line in enumerate(lines):
                if 'from rest_framework' in line and ('saas_platform.permissions' in line or 'platform.permissions' in line):
                    print(f"Fixing rest_framework import in {os.path.relpath(filepath, BACKEND_DIR)}: {line}")
                    line = line.replace('saas_platform.permissions', 'permissions')
                    line = line.replace('platform.permissions', 'permissions')
                    lines[idx] = line
                    modified = True
            
            if modified:
                new_content = '\n'.join(lines)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)

def delete_old_platform():
    # Remove old backend/platform if it exists
    old_platform = os.path.join(BACKEND_DIR, 'platform')
    if os.path.exists(old_platform):
        print(f"Removing old platform directory {old_platform}...")
        shutil.rmtree(old_platform)

if __name__ == '__main__':
    print("Starting backend restructure completion...")
    clean_and_move_apps()
    print("Setting up app configs...")
    setup_apps_config()
    print("Fixing import syntax errors...")
    fix_import_syntax_errors()
    print("Deleting old platform directory...")
    delete_old_platform()
    print("Completion script run successfully!")
