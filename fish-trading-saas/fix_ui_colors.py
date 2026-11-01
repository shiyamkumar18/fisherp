import os
import re
import glob

def replace_colors(content):
    content = re.sub(r'bg-slate-50\b', 'bg-card', content)
    content = re.sub(r'bg-slate-100\b', 'bg-hover', content)
    content = re.sub(r'bg-slate-200\b', 'bg-border', content)
    content = re.sub(r'bg-slate-800\b', 'bg-elevated', content)
    content = re.sub(r'bg-slate-900\b', 'bg-card', content)
    content = re.sub(r'bg-slate-950\b', 'bg-bg', content)
    content = re.sub(r'text-slate-800\b', 'text-textPrimary', content)
    content = re.sub(r'text-slate-700\b', 'text-textPrimary', content)
    content = re.sub(r'text-slate-600\b', 'text-textSecondary', content)
    content = re.sub(r'text-slate-500\b', 'text-textSecondary', content)
    content = re.sub(r'text-slate-400\b', 'text-textSecondary/70', content)
    content = re.sub(r'text-slate-300\b', 'text-textSecondary/50', content)
    content = re.sub(r'border-slate-100\b', 'border-border/50', content)
    content = re.sub(r'border-slate-200\b', 'border-border', content)
    content = re.sub(r'border-slate-300\b', 'border-border', content)
    content = re.sub(r'border-slate-700\b', 'border-border', content)
    content = re.sub(r'border-slate-800\b', 'border-border', content)
    content = re.sub(r'indigo-600\b', 'primary', content)
    content = re.sub(r'indigo-500\b', 'primary', content)
    content = re.sub(r'indigo-400\b', 'primary', content)
    content = re.sub(r'indigo-700\b', 'primaryHover', content)
    content = re.sub(r'indigo-50\b', 'primary/10', content)
    content = re.sub(r'indigo-100\b', 'primary/20', content)
    content = re.sub(r'emerald-600\b', 'success', content)
    content = re.sub(r'emerald-500\b', 'success', content)
    content = re.sub(r'emerald-400\b', 'success', content)
    content = re.sub(r'emerald-50\b', 'success/10', content)
    content = re.sub(r'amber-600\b', 'warning', content)
    content = re.sub(r'amber-500\b', 'warning', content)
    content = re.sub(r'amber-400\b', 'warning', content)
    content = re.sub(r'amber-50\b', 'warning/10', content)
    content = re.sub(r'amber-700\b', 'warning', content)
    content = re.sub(r'amber-200\b', 'warning/30', content)
    content = re.sub(r'rose-600\b', 'danger', content)
    content = re.sub(r'rose-500\b', 'danger', content)
    content = re.sub(r'rose-50\b', 'danger/10', content)
    return content

files_to_fix = glob.glob('frontend/src/components/ui/*.jsx') + glob.glob('frontend/src/components/shared/*.jsx')

for file_path in files_to_fix:
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            content = f.read()
        
        new_content = replace_colors(content)
        
        if content != new_content:
            with open(file_path, 'w') as f:
                f.write(new_content)
            print(f"Updated {file_path}")
