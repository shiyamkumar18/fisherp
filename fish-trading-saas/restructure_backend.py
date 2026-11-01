import os
import shutil
import re

BACKEND_DIR = '/media/odoo/5AAA-AC72/project/fisherp/fish-trading-saas/backend'

APP_DOMAINS = {
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

def setup_directories():
    for domain in ['saas_platform', 'business', 'core']:
        path = os.path.join(BACKEND_DIR, domain)
        if not os.path.exists(path):
            os.makedirs(path)
        init_file = os.path.join(path, '__init__.py')
        if not os.path.exists(init_file):
            with open(init_file, 'w') as f:
                f.write('')

def move_apps():
    for app, domain in APP_DOMAINS.items():
        src = os.path.join(BACKEND_DIR, app)
        dest = os.path.join(BACKEND_DIR, domain, app)
        if os.path.exists(src) and not os.path.exists(dest):
            print(f"Moving {app} to {domain}/{app}...")
            shutil.move(src, dest)

def setup_apps_config():
    for app, domain in APP_DOMAINS.items():
        app_path = os.path.join(BACKEND_DIR, domain, app)
        if not os.path.exists(app_path):
            continue
        apps_file = os.path.join(app_path, 'apps.py')
        if os.path.exists(apps_file):
            with open(apps_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            name_pattern = r'(\bname\s*=\s*[\'"])(?:platform\.|saas_platform\.|business\.|core\.)?' + app + r'([\'"])'
            if re.search(name_pattern, new_content):
                new_content = re.sub(name_pattern, rf'\g<1>{domain}.{app}\2', new_content)
                # Ensure label = 'app' is present
                if 'label' not in new_content:
                    class_match = re.search(r'(class\s+\w+Config\s*\(AppConfig\)\s*:)', new_content)
                    if class_match:
                        header = class_match.group(1)
                        new_content = new_content.replace(header, f"{header}\n    label = '{app}'")
            with open(apps_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
        else:
            class_name = "".join([part.capitalize() for part in app.split('_')]) + "Config"
            print(f"Creating apps.py for {app}...")
            with open(apps_file, 'w', encoding='utf-8') as f:
                f.write(f"""from django.apps import AppConfig

class {class_name}(AppConfig):
    name = '{domain}.{app}'
    label = '{app}'
""")

def update_imports():
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
            for app, domain in APP_DOMAINS.items():
                new_content = re.sub(rf'\bfrom\s+{app}\b', f'from {domain}.{app}', new_content)
                new_content = re.sub(rf'\bimport\s+{app}\b', f'import {domain}.{app}', new_content)
                new_content = re.sub(rf'([\'"]){app}\.([a-z])', rf'\1{domain}.{app}.\2', new_content)

                if file == 'settings.py':
                    new_content = re.sub(rf'([\'"]){app}([\'"])', rf'\1{domain}.{app}\2', new_content)

            if new_content != content:
                print(f"Updating imports in {os.path.relpath(filepath, BACKEND_DIR)}...")
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)

if __name__ == '__main__':
    print("Setting up directories...")
    setup_directories()
    print("Moving apps...")
    move_apps()
    print("Setting up app configs...")
    setup_apps_config()
    print("Updating imports...")
    update_imports()
    print("Restructuring completed successfully!")
