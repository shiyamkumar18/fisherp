import os
import re

BACKEND_DIR = '/media/odoo/5AAA-AC72/project/fisherp/fish-trading-saas/backend'

def fix_model_references():
    prefixes = ['saas_platform.', 'business.', 'core.']
    
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
            
            # The regex searches for strings like 'companies.company' 
            # and replaces it with 'companies.company'
            # We look for quote, then prefix, then word.word, then quote
            for prefix in prefixes:
                # e.g., 'companies.company' -> 'companies.company'
                pattern = r'([\'"])' + re.escape(prefix) + r'([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)([\'"])'
                new_content = re.sub(pattern, r'\1\2\3', new_content)
                
            if new_content != content:
                print(f"Fixed model references in {os.path.relpath(filepath, BACKEND_DIR)}")
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)

if __name__ == '__main__':
    fix_model_references()
    print("Fix completed!")
