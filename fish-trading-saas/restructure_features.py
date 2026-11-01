import os
import shutil
import re

FRONTEND_DIR = '/media/odoo/5AAA-AC72/project/fisherp/fish-trading-saas/frontend/src'
FEATURES_DIR = os.path.join(FRONTEND_DIR, 'features')
PAGES_DIR = os.path.join(FRONTEND_DIR, 'pages')

# Define domains
PLATFORM = ['admin', 'auth', 'onboarding', 'platform', 'profile', 'settings', 'subscription', 'tenant']
BUSINESS = ['buyers', 'customers', 'dashboard', 'inventory', 'orders', 'payments', 'products', 'purchases', 'reports', 'sales', 'suppliers']
CORE = ['demo', 'errors', 'landing']

PAGE_MAPPING = {
    'customers-page.jsx': ('business', 'customers', 'CustomersPage.jsx'),
    'dashboard-page.jsx': ('business', 'dashboard', 'DashboardPage.jsx'),
    'home-portal.jsx': ('business', 'dashboard', 'HomePortal.jsx'),
    'inventory-page.jsx': ('business', 'inventory', 'InventoryPage.jsx'),
    'landing-page.jsx': ('core', 'landing', 'LandingPage.jsx'),
    'login-page.jsx': ('platform', 'auth', 'LoginPage.jsx'),
    'not-found-page.jsx': ('core', 'errors', 'NotFoundPage.jsx'),
    'orders-page.jsx': ('business', 'orders', 'OrdersPage.jsx'),
    'payment-detail-page.jsx': ('business', 'payments', 'PaymentDetailPage.jsx'),
    'payments-page.jsx': ('business', 'payments', 'PaymentsPage.jsx'),
    'products-page.jsx': ('business', 'products', 'ProductsPage.jsx'),
    'profile-page.jsx': ('platform', 'profile', 'ProfilePage.jsx'),
    'purchase-detail-page.jsx': ('business', 'purchases', 'PurchaseDetailPage.jsx'),
    'purchases-page.jsx': ('business', 'purchases', 'PurchasesPage.jsx'),
    'register-page.jsx': ('platform', 'auth', 'RegisterPage.jsx'),
    'reports-page.jsx': ('business', 'reports', 'ReportsPage.jsx'),
    'sale-detail-page.jsx': ('business', 'sales', 'SaleDetailPage.jsx'),
    'sales-page.jsx': ('business', 'sales', 'SalesPage.jsx'),
    'settings-page.jsx': ('platform', 'settings', 'SettingsPage.jsx'),
    'suppliers-page.jsx': ('business', 'suppliers', 'SuppliersPage.jsx'),
}

def setup_directories():
    for d in ['platform', 'business', 'core']:
        path = os.path.join(FEATURES_DIR, d)
        if not os.path.exists(path):
            os.makedirs(path)

def move_features():
    for feature in os.listdir(FEATURES_DIR):
        feature_path = os.path.join(FEATURES_DIR, feature)
        if not os.path.isdir(feature_path) or feature in ['platform', 'business', 'core']:
            continue
            
        if feature in PLATFORM:
            shutil.move(feature_path, os.path.join(FEATURES_DIR, 'platform', feature))
        elif feature in BUSINESS:
            shutil.move(feature_path, os.path.join(FEATURES_DIR, 'business', feature))
        elif feature in CORE:
            shutil.move(feature_path, os.path.join(FEATURES_DIR, 'core', feature))
        else:
            print(f"Unknown feature {feature}, moving to core")
            shutil.move(feature_path, os.path.join(FEATURES_DIR, 'core', feature))

def move_pages():
    if not os.path.exists(PAGES_DIR):
        return
        
    for page_file, (domain, feature, new_name) in PAGE_MAPPING.items():
        src_path = os.path.join(PAGES_DIR, page_file)
        if not os.path.exists(src_path):
            continue
            
        dest_dir = os.path.join(FEATURES_DIR, domain, feature, 'pages')
        if not os.path.exists(dest_dir):
            os.makedirs(dest_dir)
            
        dest_path = os.path.join(dest_dir, new_name)
        # We overwrite to prioritize the flat files if they were the active ones,
        # but wait, the flat pages have the actual logic used in App.jsx.
        # Let's move them over to the structured path.
        shutil.move(src_path, dest_path)
        
    # Remove pages directory if empty or delete it entirely
    try:
        shutil.rmtree(PAGES_DIR)
    except:
        pass

def generate_replacements():
    replacements = []
    
    # Imports moving from old features to new features
    for feature in PLATFORM:
        replacements.append((f'@/features/{feature}', f'@/features/platform/{feature}'))
    for feature in BUSINESS:
        replacements.append((f'@/features/{feature}', f'@/features/business/{feature}'))
    for feature in CORE:
        replacements.append((f'@/features/{feature}', f'@/features/core/{feature}'))
        
    # Map flat pages imports in App.jsx
    for old_file, (domain, feature, new_name) in PAGE_MAPPING.items():
        old_import = f'@/pages/{old_file.replace(".jsx", "")}'
        new_import = f'@/features/{domain}/{feature}/pages/{new_name.replace(".jsx", "")}'
        replacements.append((old_import, new_import))
        
    return replacements

def update_imports(replacements):
    for root, dirs, files in os.walk(FRONTEND_DIR):
        for file in files:
            if not file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                continue
                
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            new_content = content
            for old, new in replacements:
                new_content = new_content.replace(old, new)
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)

if __name__ == '__main__':
    print("Setting up directories...")
    setup_directories()
    
    print("Moving features...")
    move_features()
    
    print("Moving pages...")
    move_pages()
    
    print("Updating imports...")
    replacements = generate_replacements()
    update_imports(replacements)
    
    print("Done!")
