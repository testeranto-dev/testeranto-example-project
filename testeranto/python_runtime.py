#!/usr/bin/env python3

import sys
import json
import os
import ast
from typing import Dict, List, Set, Any
import hashlib

import time

def resolve_python_import(import_path: str, current_file: str) -> str | None:
    """Resolve a Python import to a file path."""
    # Handle relative imports
    if import_path.startswith('.'):
        current_dir = os.path.dirname(current_file)
        # Count dots
        dot_count = 0
        remaining = import_path
        while remaining.startswith('.'):
            dot_count += 1
            remaining = remaining[1:]
        
        # Remove leading slash
        if remaining.startswith('/'):
            remaining = remaining[1:]
        
        # Go up appropriate number of directories
        base_dir = current_dir
        for _ in range(1, dot_count):
            base_dir = os.path.dirname(base_dir)
        
        # Handle case with no remaining path
        if not remaining:
            init_path = os.path.join(base_dir, '__init__.py')
            if os.path.exists(init_path):
                return init_path
            return None
        
        # Resolve full path
        resolved = os.path.join(base_dir, remaining)
        
        # Try different extensions
        for ext in ['.py', '/__init__.py']:
            potential = resolved + ext
            if os.path.exists(potential):
                return potential
        
        # Check if it's a directory with __init__.py
        if os.path.exists(resolved) and os.path.isdir(resolved):
            init_path = os.path.join(resolved, '__init__.py')
            if os.path.exists(init_path):
                return init_path
        return None
    
    # Handle absolute imports
    # Look in various directories
    dirs = [
        os.path.dirname(current_file),
        os.getcwd(),
    ] + os.environ.get('PYTHONPATH', '').split(os.pathsep)
    
    for dir_path in dirs:
        if not dir_path:
            continue
        potential_paths = [
            os.path.join(dir_path, import_path + '.py'),
            os.path.join(dir_path, import_path, '__init__.py'),
            os.path.join(dir_path, import_path.replace('.', '/') + '.py'),
            os.path.join(dir_path, import_path.replace('.', '/'), '__init__.py'),
        ]
        for potential in potential_paths:
            if os.path.exists(potential):
                return potential
    return None

def parse_python_imports(file_path: str) -> List[Dict[str, Any]]:
    """Parse import statements from a Python file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}")
        return []
    
    try:
        tree = ast.parse(content)
    except SyntaxError as e:
        print(f"Warning: Syntax error in {file_path}: {e}")
        return []
    
    imports = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                import_path = alias.name
                resolved = resolve_python_import(import_path, file_path)
                imports.append({
                    'path': import_path,
                    'kind': 'import-statement',
                    'external': resolved is None,
                })
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                import_path = node.module
                resolved = resolve_python_import(import_path, file_path)
                imports.append({
                    'path': import_path,
                    'kind': 'import-statement',
                    'external': resolved is None,
                })
    return imports

def collect_dependencies(file_path: str, visited: Set[str] = None) -> List[str]:
    """Collect all dependencies of a Python file recursively."""
    if visited is None:
        visited = set()
    
    if file_path in visited:
        return []
    visited.add(file_path)
    
    dependencies = [file_path]
    imports = parse_python_imports(file_path)
    
    for imp in imports:
        if not imp.get('external') and imp['path']:
            resolved = resolve_python_import(imp['path'], file_path)
            if resolved and os.path.exists(resolved):
                dependencies.extend(collect_dependencies(resolved, visited))
    
    # Remove duplicates
    seen = set()
    unique = []
    for dep in dependencies:
        if dep not in seen:
            seen.add(dep)
            unique.append(dep)
    return unique

def topological_sort(files: List[str]) -> List[str]:
    """Sort files based on import dependencies."""
    # Build dependency graph
    graph = {file: set() for file in files}
    for file in files:
        imports = parse_python_imports(file)
        for imp in imports:
            if not imp.get('external') and imp['path']:
                resolved = resolve_python_import(imp['path'], file)
                if resolved and resolved in files:
                    graph[file].add(resolved)
    
    # Kahn's algorithm
    in_degree = {node: 0 for node in graph}
    for node in graph:
        for neighbor in graph[node]:
            in_degree[neighbor] += 1
    
    # Queue of nodes with no incoming edges
    queue = [node for node in graph if in_degree[node] == 0]
    sorted_list = []
    
    while queue:
        node = queue.pop(0)
        sorted_list.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    # Check for cycles
    if len(sorted_list) != len(files):
        print("Warning: Circular dependencies detected, using original order")
        return files
    
    return sorted_list

def strip_imports(content: str) -> str:
    """Remove import statements from Python code."""
    lines = content.split('\n')
    result_lines = []
    in_multiline_string = False
    multiline_delimiter = None
    
    for line in lines:
        # Handle multiline strings
        stripped_line = line.strip()
        if not in_multiline_string:
            # Check for start of multiline string
            if stripped_line.startswith('"""') or stripped_line.startswith("'''"):
                # Check if it's a single line or multiline
                if stripped_line.count('"""') == 1 or stripped_line.count("'''") == 1:
                    in_multiline_string = True
                    multiline_delimiter = stripped_line[:3]
                result_lines.append(line)
                continue
            # Check for import statements
            elif stripped_line.startswith('import ') or stripped_line.startswith('from '):
                # Skip this line
                continue
            else:
                result_lines.append(line)
        else:
            # Inside a multiline string
            result_lines.append(line)
            # Check for end of multiline string
            if multiline_delimiter in stripped_line:
                # Count occurrences to handle cases where delimiter appears in the string
                if stripped_line.count(multiline_delimiter) % 2 == 1:
                    in_multiline_string = False
                    multiline_delimiter = None
    
    return '\n'.join(result_lines)

def bundle_python_files(entry_point: str, test_name: str, output_base_dir: str) -> str:
    """Generate bundle files similar to Ruby runtime."""
    print(f"[Python Builder] Processing: {entry_point}")
    
    # Use the original entry point path to preserve directory structure
    # This matches Ruby's pattern: testeranto/bundles/#{test_name}/#{entry_point}
    # entry_point might be something like "src/python/Calculator.pitono.test.py"
    
    # Create the bundle path: testeranto/bundles/{test_name}/{entry_point}
    # We need to handle both absolute and relative paths
    if os.path.isabs(entry_point):
        # If it's an absolute path, make it relative to current directory
        # But first check if it's under workspace
        workspace_root = '/workspace'
        if entry_point.startswith(workspace_root):
            # Make it relative to workspace root
            rel_entry_path = entry_point[len(workspace_root):]
            if rel_entry_path.startswith('/'):
                rel_entry_path = rel_entry_path[1:]
        else:
            # Make it relative to current directory
            rel_entry_path = os.path.relpath(entry_point, os.getcwd())
    else:
        # It's already a relative path
        rel_entry_path = entry_point
    
    print(f"[Python Builder] Using entry path: {rel_entry_path}")
    
    # Create output directory structure: testeranto/bundles/{test_name}/{dir_of_rel_entry_path}
    output_dir = os.path.join(output_base_dir, test_name, os.path.dirname(rel_entry_path))
    # Remove any empty directory component
    if output_dir.endswith('.'):
        output_dir = os.path.dirname(output_dir)
    os.makedirs(output_dir, exist_ok=True)
    
    # Get entry point filename
    entry_filename = os.path.basename(entry_point)
    
    # 1. Collect all dependencies
    all_deps = collect_dependencies(entry_point)
    # Ensure entry point is included
    if entry_point not in all_deps:
        all_deps.append(entry_point)
    # Sort for consistency
    all_deps = sorted(set(all_deps))
    
    print(f"[Python Builder] Found {len(all_deps)} dependencies")
    
    # 2. Compute hash of input files (similar to Ruby's compute_files_hash)
    files_hash = compute_files_hash(all_deps)
    print(f"[Python Builder] Computed hash: {files_hash}")
    
    # 3. Write input files JSON
    # Convert to workspace-relative paths
    relative_files = []
    for dep in all_deps:
        abs_path = os.path.abspath(dep)
        if abs_path.startswith(workspace_root):
            rel_path = abs_path[len(workspace_root):]
            # Ensure it starts with /
            if not rel_path.startswith('/'):
                rel_path = '/' + rel_path
            relative_files.append(rel_path)
        else:
            # If not under workspace, use relative path from current directory
            rel_path = os.path.relpath(abs_path, os.getcwd())
            relative_files.append(rel_path)
    
    # Create input files path similar to Ruby: testeranto/bundles/{test_name}/{entry_point}-inputFiles.json
    # The Ruby builder uses: "testeranto/bundles/#{test_name}/#{entry_point}-inputFiles.json"
    # We need to handle the path correctly
    # First, normalize the entry point path for use in filename
    input_files_basename = rel_entry_path.replace('/', '_').replace('\\', '_') + '-inputFiles.json'
    input_files_path = os.path.join(output_base_dir, test_name, input_files_basename)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(input_files_path), exist_ok=True)
    
    with open(input_files_path, 'w', encoding='utf-8') as f:
        json.dump(relative_files, f, indent=2)
    print(f"[Python Builder] Wrote input files to: {input_files_path}")
    
    # 4. Create dummy bundle file that loads the original test file
    # Similar to Ruby: testeranto/bundles/#{test_name}/#{entry_point}
    bundle_path = os.path.join(output_base_dir, test_name, rel_entry_path)
    
    # Ensure the directory for the bundle exists
    os.makedirs(os.path.dirname(bundle_path), exist_ok=True)
    
    # Create a simple bundle that loads and executes the original test file
    # Use absolute path for the original test file
    original_test_abs = os.path.abspath(entry_point)
    bundle_content = f'''#!/usr/bin/env python3
# Dummy bundle file generated by testeranto
# Hash: {files_hash}
# This file loads and executes the original test file: {original_test_abs}

import sys
import os

# Add the original file's directory to sys.path if needed
original_dir = os.path.dirname(r'{original_test_abs}')
if original_dir not in sys.path:
    sys.path.insert(0, original_dir)

# Load and execute the original test file
# Using exec to ensure execution every time
with open(r'{original_test_abs}', 'r', encoding='utf-8') as f:
    code = f.read()

# Execute the code in the global namespace
exec(code, {{'__name__': '__main__', '__file__': r'{original_test_abs}'}})

# If the test framework requires explicit test execution, add it here
# For example:
#   if 'TestFramework' in locals():
#       TestFramework.run()
'''
    
    with open(bundle_path, 'w', encoding='utf-8') as f:
        f.write(bundle_content)
    
    # Make executable
    try:
        os.chmod(bundle_path, 0o755)
    except:
        pass
    
    print(f"[Python Builder] Created dummy bundle file at: {bundle_path}")
    
    return input_files_path

# Remove generate_metafile function as we're following Ruby pattern

def compute_files_hash(files: List[str]) -> str:
    """Compute a simple hash from file paths and contents, similar to Ruby's compute_files_hash."""
    import hashlib
    
    hash_obj = hashlib.md5()
    
    for file_path in files:
        try:
            if os.path.exists(file_path):
                # Add file path
                hash_obj.update(file_path.encode('utf-8'))
                # Add file stats
                stats = os.stat(file_path)
                hash_obj.update(str(stats.st_mtime).encode('utf-8'))
                hash_obj.update(str(stats.st_size).encode('utf-8'))
            else:
                # File may not exist, include its name anyway
                hash_obj.update(file_path.encode('utf-8'))
                hash_obj.update(b'missing')
        except Exception as error:
            # If we can't stat the file, still include its name
            hash_obj.update(file_path.encode('utf-8'))
            hash_obj.update(b'error')
    
    return hash_obj.hexdigest()

def main():
    print(f"[Python Builder] ARGV: {sys.argv}")
    
    # Parse command line arguments similar to Ruby runtime
    # Expected: python.py project_config_file_path python_config_file_path test_name entryPoints...
    if len(sys.argv) < 4:
        print("[Python Builder] Error: Insufficient arguments")
        print("Usage: python.py <project_config> <python_config> <test_name> <entry_points...>")
        sys.exit(1)
    
    project_config_file_path = sys.argv[1]
    python_config_file_path = sys.argv[2]
    test_name = sys.argv[3]
    entry_points = sys.argv[4:]
    
    print(f"[Python Builder] Project config: {project_config_file_path}")
    print(f"[Python Builder] Python config: {python_config_file_path}")
    print(f"[Python Builder] Test name: {test_name}")
    print(f"[Python Builder] Entry points: {entry_points}")
    
    # Create a dictionary to store all tests' information
    all_tests_info = {}
    
    # Process each entry point
    for entry_point in entry_points:
        print(f"[Python Builder] Processing Python test: {entry_point}")
        
        # Get absolute path to entry point
        entry_point_path = os.path.abspath(entry_point)
        
        # Check if entry point exists
        if not os.path.exists(entry_point_path):
            print(f"[Python Builder] Error: Entry point does not exist: {entry_point_path}")
            sys.exit(1)
        
        # Collect all dependencies
        all_deps = collect_dependencies(entry_point_path)
        # Ensure entry point is included
        if entry_point_path not in all_deps:
            all_deps.append(entry_point_path)
        # Sort for consistency
        all_deps = sorted(set(all_deps))
        
        print(f"[Python Builder] Found {len(all_deps)} dependencies")
        
        # Compute hash of input files
        files_hash = compute_files_hash(all_deps)
        print(f"[Python Builder] Computed hash: {files_hash}")
        
        # Convert to workspace-relative paths
        workspace_root = '/workspace'
        relative_files = []
        for dep in all_deps:
            abs_path = os.path.abspath(dep)
            if abs_path.startswith(workspace_root):
                rel_path = abs_path[len(workspace_root):]
                # Ensure it starts with /
                if not rel_path.startswith('/'):
                    rel_path = '/' + rel_path
                relative_files.append(rel_path)
            else:
                # If not under workspace, use relative path from current directory
                rel_path = os.path.relpath(abs_path, os.getcwd())
                relative_files.append(rel_path)
        
        # Store test information
        all_tests_info[entry_point] = {
            "hash": files_hash,
            "files": relative_files
        }
        
        # Create the dummy bundle file that requires the original test file
        # Similar to Ruby: testeranto/bundles/#{test_name}/#{entry_point}
        # We need to handle the path correctly
        if os.path.isabs(entry_point):
            # If it's an absolute path, make it relative to workspace
            if entry_point.startswith(workspace_root):
                rel_entry_path = entry_point[len(workspace_root):]
                if rel_entry_path.startswith('/'):
                    rel_entry_path = rel_entry_path[1:]
            else:
                rel_entry_path = os.path.relpath(entry_point, os.getcwd())
        else:
            rel_entry_path = entry_point
        
        bundle_path = os.path.join("testeranto/bundles", test_name, rel_entry_path)
        
        # Ensure the directory for the bundle exists
        os.makedirs(os.path.dirname(bundle_path), exist_ok=True)
        
        # Create a simple bundle that loads and executes the original test file
        original_test_abs = os.path.abspath(entry_point)
        bundle_content = f'''#!/usr/bin/env python3
# Dummy bundle file generated by testeranto
# Hash: {files_hash}
# This file loads and executes the original test file: {original_test_abs}

import sys
import os

# Add the original file's directory to sys.path if needed
original_dir = os.path.dirname(r'{original_test_abs}')
if original_dir not in sys.path:
    sys.path.insert(0, original_dir)

# Load and execute the original test file
# Using exec to ensure execution every time
with open(r'{original_test_abs}', 'r', encoding='utf-8') as f:
    code = f.read()

# Execute the code in the global namespace
exec(code, {{'__name__': '__main__', '__file__': r'{original_test_abs}'}})

# If the test framework requires explicit test execution, add it here
# For example:
#   if 'TestFramework' in locals():
#       TestFramework.run()
'''
        
        with open(bundle_path, 'w', encoding='utf-8') as f:
            f.write(bundle_content)
        
        # Make executable
        try:
            os.chmod(bundle_path, 0o755)
        except:
            pass
        
        print(f"[Python Builder] Created dummy bundle file at: {bundle_path}")
    
    # Write single inputFiles.json for all tests
    input_files_path = os.path.join("testeranto/bundles", test_name, "inputFiles.json")
    os.makedirs(os.path.dirname(input_files_path), exist_ok=True)
    with open(input_files_path, 'w', encoding='utf-8') as f:
        json.dump(all_tests_info, f, indent=2)
    print(f"[Python Builder] Wrote inputFiles.json for {len(all_tests_info)} tests to {input_files_path}")
    
    print("[Python Builder] Python builder completed")

if __name__ == "__main__":
    main()
