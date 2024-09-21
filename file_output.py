import os
import csv
import re
import mimetypes

def analyze_nextjs_project(root_dir):
    project_structure = []

    for dirpath, dirnames, filenames in os.walk(root_dir):
        depth = dirpath[len(root_dir):].count(os.sep)
        indent = '  ' * depth
        folder_name = os.path.basename(dirpath)

        if '.next' in dirnames:
            dirnames.remove('.next')  # Skip .next directory
        if 'node_modules' in dirnames:
            dirnames.remove('node_modules')  # Skip node_modules directory

        description = get_folder_description(folder_name)
        project_structure.append([f"{indent}{folder_name}/", description])

        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            file_description = get_file_description(filename)
            file_content = search_file_content(file_path)
            project_structure.append([f"{indent}  {filename}", file_description, file_content])

    return project_structure

def get_folder_description(folder_name):
    descriptions = {
        'pages': 'Contains page components and routing structure',
        'components': 'Reusable React components',
        'styles': 'CSS or styling related files',
        'public': 'Static assets served directly by Next.js',
        'lib': 'Custom libraries or utility functions',
        'api': 'API routes for server-side functionality',
        'contexts': 'React context providers',
        'hooks': 'Custom React hooks',
        'config': 'Configuration files',
        'tests': 'Test files and test-related utilities',
    }
    return descriptions.get(folder_name, 'Project folder')

def get_file_description(filename):
    _, ext = os.path.splitext(filename)
    descriptions = {
        '.js': 'JavaScript file',
        '.jsx': 'React component file',
        '.ts': 'TypeScript file',
        '.tsx': 'TypeScript React component file',
        '.css': 'CSS stylesheet',
        '.scss': 'SASS stylesheet',
        '.json': 'JSON configuration file',
        '.md': 'Markdown documentation file',
        'package.json': 'Node.js package configuration',
        'next.config.js': 'Next.js configuration file',
        '.env': 'Environment variables file',
        '.gitignore': 'Git ignore rules',
    }
    return descriptions.get(filename, descriptions.get(ext, 'Project file'))

def search_file_content(file_path):
    mime_type, _ = mimetypes.guess_type(file_path)
    
    if mime_type and not mime_type.startswith('text'):
        return f"Binary file (MIME type: {mime_type})"

    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            
            patterns = {
                'React component': r'function\s+\w+\s*\([^)]*\)\s*{\s*return\s*\(',
                'API route': r'export\s+default\s+function\s+handler\s*\(',
                'getServerSideProps': r'export\s+async\s+function\s+getServerSideProps',
                'getStaticProps': r'export\s+async\s+function\s+getStaticProps',
                'getStaticPaths': r'export\s+async\s+function\s+getStaticPaths',
                'Custom hook': r'function\s+use\w+\s*\(',
                'Context provider': r'export\s+const\s+\w+Context\s*=\s*createContext',
            }
            
            findings = []
            for key, pattern in patterns.items():
                if re.search(pattern, content):
                    findings.append(key)
            
            return ', '.join(findings) if findings else 'Text file, no specific patterns found'
    except UnicodeDecodeError:
        return "Binary file or non-UTF-8 encoded text file"
    except Exception as e:
        return f"Error reading file: {str(e)}"

def export_to_csv(data, output_file):
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Path', 'Description', 'File Content'])
        writer.writerows(data)

def export_to_txt(data, output_file):
    with open(output_file, 'w', encoding='utf-8') as txtfile:
        for item in data:
            txtfile.write(f"{item[0]:<40} {item[1]}\n")
            if len(item) > 2:
                txtfile.write(f"  Content: {item[2]}\n")
            txtfile.write('\n')

if __name__ == '__main__':
    project_root = input("Enter the path to your Next.js project root (press Enter for current directory): ").strip()
    if not project_root:
        project_root = os.getcwd()

    output_format = input("Enter the desired output format (csv/txt, press Enter for csv): ").lower().strip()
    if not output_format:
        output_format = 'csv'

    structure = analyze_nextjs_project(project_root)

    if output_format == 'csv':
        output_file = 'nextjs_project_structure.csv'
        export_to_csv(structure, output_file)
    elif output_format == 'txt':
        output_file = 'nextjs_project_structure.txt'
        export_to_txt(structure, output_file)
    else:
        print("Invalid output format. Using default 'csv' format.")
        output_file = 'nextjs_project_structure.csv'
        export_to_csv(structure, output_file)

    print(f"Project structure exported to {output_file}")