import re
import os
import glob

version_file = 'version.js'

def bump_version():
    if not os.path.exists(version_file):
        with open(version_file, 'w', encoding='utf-8') as f:
            f.write('window.APP_VERSION = "11.1";')
        print("Criado version.js com v11.1")
        return

    with open(version_file, 'r', encoding='utf-8') as f:
        content = f.read()

    match = re.search(r'APP_VERSION\s*=\s*"(\d+)\.(\d+)"', content)
    if match:
        major = int(match.group(1))
        minor = int(match.group(2))
        new_minor = minor + 1
        new_version = f'{major}.{new_minor}'
        new_content = re.sub(r'APP_VERSION\s*=\s*"\d+\.\d+"', f'APP_VERSION = "{new_version}"', content)
        
        with open(version_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Versão atualizada para: v{new_version}")
        
        # Cache Busting for all HTML files
        update_html_cache_busting(new_version)
    else:
        print("Padrão de versão não encontrado no arquivo.")

def update_html_cache_busting(version):
    html_files = glob.glob("*.html")
    for html_path in html_files:
        with open(html_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 1. Update existing ?v=...
        new_content = re.sub(r'(\.js|\.css)\?v=[\d\.]+', f'\\1?v={version}', content)
        
        # 2. Add ?v= to local files that don't have it yet
        # Matches: src="script.js" or href="style.css"
        # Avoids: absolute URLs (http://, https://)
        new_content = re.sub(r'(src|href)="(?!(?:https?:)?//)([^"]+\.(?:js|css))"', f'\\1="\\2?v={version}"', new_content)
        
        if new_content != content:
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Cache-busting atualizado em: {html_path}")

if __name__ == "__main__":
    bump_version()
