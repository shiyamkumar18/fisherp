import os
import re

BACKEND_DIR = '/media/odoo/5AAA-AC72/project/fisherp/fish-trading-saas/backend'

def fix_imports():
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
            
            # The syntax error was caused by changing:
            # from rest_framework import permissions, status
            # to
            # from rest_framework import permissions, status
            
            # Fix it globally by reverting 'permissions' inside 'from rest_framework import ...'
            new_content = re.sub(
                r'(from\s+rest_framework\s+import\s+[^a-zA-Z0-9_]*?)saas_platform\.permissions',
                r'\1permissions',
                new_content
            )

            # Another case could be 'from rest_framework import permissions'
            new_content = re.sub(
                r'(from\s+rest_framework\s+import\s+)saas_platform\.permissions',
                r'\1permissions',
                new_content
            )
            
            # Some instances were 'from rest_framework import viewsets, permissions'
            new_content = re.sub(
                r'saas_platform\.permissions(\s*,\s*|\s*$)',
                r'permissions\1',
                new_content
            )

            # Just target the exact string:
            new_content = content.replace('import saas_platform.permissions, status', 'import saas_platform.permissions, status')
            new_content = new_content.replace('import saas_platform.permissions', 'import saas_platform.permissions')
            
            # Revert any broken rest_framework imports
            # Check if rest_framework is in the line
            final_content = []
            changed = False
            for line in content.splitlines():
                if 'from rest_framework' in line and 'permissions' in line:
                    line = line.replace('saas_platform.permissions', 'permissions')
                    changed = True
                final_content.append(line)
            
            if changed:
                new_content = '\n'.join(final_content) + '\n'
                print(f"Fixed imports in {os.path.relpath(filepath, BACKEND_DIR)}...")
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)

if __name__ == '__main__':
    fix_imports()
    print("Fix completed!")
