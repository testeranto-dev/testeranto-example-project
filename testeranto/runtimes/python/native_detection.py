#!/usr/bin/env python3
"""
Native Test Detection and Translation for Python
"""

import ast
import json
import os
import re
from typing import Dict, List, Any, Optional, Tuple

class PythonNativeTestDetection:
    """Detect and translate native Python test frameworks to testeranto format."""
    
    @staticmethod
    def detect_native_test(file_path: str) -> Dict[str, Any]:
        """
        Detect if a Python file contains native tests and identify the framework.
        
        Returns:
            Dict with keys:
                - is_native_test: bool
                - framework_type: str or None
                - test_structure: Dict with parsed test structure
        """
        if not os.path.exists(file_path):
            return {
                "is_native_test": False,
                "framework_type": None,
                "test_structure": {}
            }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception:
            return {
                "is_native_test": False,
                "framework_type": None,
                "test_structure": {}
            }
        
        # Check file naming patterns
        filename = os.path.basename(file_path)
        is_named_test = (
            filename.startswith('test_') or 
            filename.endswith('_test.py') or
            filename.endswith('_spec.py')
        )
        
        # Check for framework imports
        has_pytest_import = 'import pytest' in content or 'from pytest import' in content
        has_unittest_import = 'import unittest' in content or 'from unittest import' in content
        has_behave_import = 'import behave' in content or 'from behave import' in content
        
        # Check for test patterns in AST
        ast_test_patterns = PythonNativeTestDetection._analyze_ast(content, file_path)
        
        # Determine if it's a native test
        is_native_test = (
            is_named_test or 
            has_pytest_import or 
            has_unittest_import or 
            has_behave_import or
            ast_test_patterns['has_test_functions'] or
            ast_test_patterns['has_test_classes']
        )
        
        if not is_native_test:
            return {
                "is_native_test": False,
                "framework_type": None,
                "test_structure": {}
            }
        
        # Identify framework
        framework_type = PythonNativeTestDetection._identify_framework(
            content, has_pytest_import, has_unittest_import, has_behave_import, ast_test_patterns
        )
        
        # Extract test structure
        test_structure = PythonNativeTestDetection._extract_test_structure(
            content, file_path, framework_type
        )
        
        return {
            "is_native_test": True,
            "framework_type": framework_type,
            "test_structure": test_structure
        }
    
    @staticmethod
    def _analyze_ast(content: str, file_path: str) -> Dict[str, Any]:
        """Analyze Python AST for test patterns."""
        result = {
            "has_test_functions": False,
            "has_test_classes": False,
            "test_function_names": [],
            "test_class_names": []
        }
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                # Check for test functions (def test_*)
                if isinstance(node, ast.FunctionDef):
                    if node.name.startswith('test_'):
                        result["has_test_functions"] = True
                        result["test_function_names"].append(node.name)
                
                # Check for test classes (class *Test or class *TestCase)
                elif isinstance(node, ast.ClassDef):
                    if node.name.endswith('Test') or node.name.endswith('TestCase'):
                        result["has_test_classes"] = True
                        result["test_class_names"].append(node.name)
                        
                        # Check for test methods in class
                        for item in node.body:
                            if isinstance(item, ast.FunctionDef):
                                if item.name.startswith('test_'):
                                    result["has_test_functions"] = True
                                    result["test_function_names"].append(f"{node.name}.{item.name}")
        
        except SyntaxError:
            pass
        
        return result
    
    @staticmethod
    def _identify_framework(
        content: str, 
        has_pytest_import: bool, 
        has_unittest_import: bool, 
        has_behave_import: bool,
        ast_patterns: Dict[str, Any]
    ) -> str:
        """Identify the specific test framework."""
        if has_pytest_import or '@pytest.mark' in content or 'pytest.fixture' in content:
            return 'pytest'
        elif has_unittest_import or 'unittest.TestCase' in content:
            return 'unittest'
        elif has_behave_import:
            return 'behave'
        elif ast_patterns['has_test_functions'] or ast_patterns['has_test_classes']:
            # Default to pytest if we have test patterns but no clear imports
            return 'pytest'
        else:
            return 'unknown'
    
    @staticmethod
    def _extract_test_structure(content: str, file_path: str, framework_type: str) -> Dict[str, Any]:
        """Extract test structure based on framework type."""
        if framework_type == 'pytest':
            return PythonNativeTestDetection._extract_pytest_structure(content, file_path)
        elif framework_type == 'unittest':
            return PythonNativeTestDetection._extract_unittest_structure(content, file_path)
        elif framework_type == 'behave':
            return PythonNativeTestDetection._extract_behave_structure(content, file_path)
        else:
            return PythonNativeTestDetection._extract_generic_structure(content, file_path)
    
    @staticmethod
    def _extract_pytest_structure(content: str, file_path: str) -> Dict[str, Any]:
        """Extract pytest test structure."""
        structure = {
            "test_functions": [],
            "fixtures": [],
            "test_classes": [],
            "marks": []
        }
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                # Find test functions
                if isinstance(node, ast.FunctionDef):
                    if node.name.startswith('test_'):
                        structure["test_functions"].append({
                            "name": node.name,
                            "line": node.lineno,
                            "decorators": PythonNativeTestDetection._get_decorators(node)
                        })
                
                # Find test classes
                elif isinstance(node, ast.ClassDef):
                    if node.name.endswith('Test') or any(
                        isinstance(base, ast.Name) and base.id.endswith('Test') 
                        for base in node.bases
                    ):
                        class_info = {
                            "name": node.name,
                            "line": node.lineno,
                            "test_methods": []
                        }
                        
                        # Find test methods in class
                        for item in node.body:
                            if isinstance(item, ast.FunctionDef):
                                if item.name.startswith('test_'):
                                    class_info["test_methods"].append({
                                        "name": item.name,
                                        "line": item.lineno,
                                        "decorators": PythonNativeTestDetection._get_decorators(item)
                                    })
                        
                        structure["test_classes"].append(class_info)
                
                # Find fixtures
                elif isinstance(node, ast.FunctionDef):
                    for decorator in node.decorator_list:
                        if isinstance(decorator, ast.Call):
                            if isinstance(decorator.func, ast.Name):
                                if decorator.func.id == 'fixture':
                                    structure["fixtures"].append({
                                        "name": node.name,
                                        "line": node.lineno
                                    })
        
        except SyntaxError:
            pass
        
        return structure
    
    @staticmethod
    def _extract_unittest_structure(content: str, file_path: str) -> Dict[str, Any]:
        """Extract unittest test structure."""
        structure = {
            "test_classes": [],
            "test_methods": []
        }
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    # Check if class inherits from unittest.TestCase
                    is_test_case = False
                    for base in node.bases:
                        if isinstance(base, ast.Attribute):
                            if base.attr == 'TestCase' and isinstance(base.value, ast.Name):
                                if base.value.id == 'unittest':
                                    is_test_case = True
                        elif isinstance(base, ast.Name):
                            if base.id == 'TestCase':
                                is_test_case = True
                    
                    if is_test_case:
                        class_info = {
                            "name": node.name,
                            "line": node.lineno,
                            "test_methods": []
                        }
                        
                        # Find test methods (start with test_)
                        for item in node.body:
                            if isinstance(item, ast.FunctionDef):
                                if item.name.startswith('test_'):
                                    class_info["test_methods"].append({
                                        "name": item.name,
                                        "line": item.lineno
                                    })
                        
                        structure["test_classes"].append(class_info)
        
        except SyntaxError:
            pass
        
        return structure
    
    @staticmethod
    def _extract_behave_structure(content: str, file_path: str) -> Dict[str, Any]:
        """Extract behave (BDD) test structure."""
        structure = {
            "step_definitions": [],
            "feature_files": []
        }
        
        # Look for step definitions (functions with @given, @when, @then decorators)
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    for decorator in node.decorator_list:
                        if isinstance(decorator, ast.Name):
                            if decorator.id in ['given', 'when', 'then', 'step']:
                                structure["step_definitions"].append({
                                    "name": node.name,
                                    "decorator": decorator.id,
                                    "line": node.lineno
                                })
        
        except SyntaxError:
            pass
        
        return structure
    
    @staticmethod
    def _extract_generic_structure(content: str, file_path: str) -> Dict[str, Any]:
        """Extract generic test structure."""
        structure = {
            "test_functions": [],
            "test_classes": []
        }
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    if node.name.startswith('test_'):
                        structure["test_functions"].append({
                            "name": node.name,
                            "line": node.lineno
                        })
                
                elif isinstance(node, ast.ClassDef):
                    if node.name.endswith('Test'):
                        structure["test_classes"].append({
                            "name": node.name,
                            "line": node.lineno
                        })
        
        except SyntaxError:
            pass
        
        return structure
    
    @staticmethod
    def _get_decorators(node: ast.FunctionDef) -> List[str]:
        """Get decorator names from a function node."""
        decorators = []
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Name):
                decorators.append(decorator.id)
            elif isinstance(decorator, ast.Call):
                if isinstance(decorator.func, ast.Name):
                    decorators.append(decorator.func.id)
        return decorators
    
    @staticmethod
    def translate_to_testeranto(detection_result: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate testeranto's three canonical components from native test detection.
        
        Returns:
            Dict with keys:
                - specification: Generated specification code
                - implementation: Generated implementation code  
                - adapter: Generated adapter code
        """
        if not detection_result["is_native_test"]:
            return {
                "specification": "",
                "implementation": "",
                "adapter": ""
            }
        
        framework = detection_result["framework_type"]
        structure = detection_result["test_structure"]
        
        if framework == 'pytest':
            return PythonNativeTestDetection._generate_pytest_components(structure)
        elif framework == 'unittest':
            return PythonNativeTestDetection._generate_unittest_components(structure)
        elif framework == 'behave':
            return PythonNativeTestDetection._generate_behave_components(structure)
        else:
            return PythonNativeTestDetection._generate_generic_components(structure)
    
    @staticmethod
    def _generate_pytest_components(structure: Dict[str, Any]) -> Dict[str, str]:
        """Generate testeranto components for pytest tests."""
        # Generate specification
        spec_lines = [
            "# Generated specification for pytest tests",
            "const specification = (Suite, Given, When, Then) => ["
        ]
        
        # Add suites for test classes
        for test_class in structure.get("test_classes", []):
            class_name = test_class["name"]
            spec_lines.append(f'  Suite("{class_name}", {{')
            
            # Create a Given for each test class
            spec_lines.append(f'    "{class_name} setup": Given(')
            spec_lines.append(f'      ["{class_name} tests"],')
            spec_lines.append('      [')
            
            # Add Whens for test methods
            for method in test_class.get("test_methods", []):
                method_name = method["name"]
                spec_lines.append(f'        When("{method_name}", /* ... */),')
            
            spec_lines.append('      ],')
            spec_lines.append('      [')
            
            # Add Thens (assertions would be in the test methods)
            spec_lines.append('        Then("assertions pass", /* ... */),')
            spec_lines.append('      ]')
            spec_lines.append('    ),')
            spec_lines.append('  }),')
        
        # Add suites for standalone test functions
        for test_func in structure.get("test_functions", []):
            func_name = test_func["name"]
            spec_lines.append(f'  Suite("{func_name}", {{')
            spec_lines.append(f'    "{func_name} setup": Given(')
            spec_lines.append(f'      ["{func_name}"],')
            spec_lines.append('      [')
            spec_lines.append(f'        When("{func_name}", /* ... */),')
            spec_lines.append('      ],')
            spec_lines.append('      [')
            spec_lines.append('        Then("assertions pass", /* ... */),')
            spec_lines.append('      ]')
            spec_lines.append('    ),')
            spec_lines.append('  }),')
        
        spec_lines.append("];")
        
        specification = "\n".join(spec_lines)
        
        # Generate implementation
        implementation = '''# Generated implementation for pytest tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};'''
        
        # Generate adapter
        adapter = '''# Generated adapter for pytest tests
const adapter = {
  beforeAll: (input, testResource) => {
    // pytest setup
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    // pytest fixture setup
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    // Execute pytest test function
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    // Execute pytest assertions
    return thenCB(store);
  }
};'''
        
        return {
            "specification": specification,
            "implementation": implementation,
            "adapter": adapter
        }
    
    @staticmethod
    def _generate_unittest_components(structure: Dict[str, Any]) -> Dict[str, str]:
        """Generate testeranto components for unittest tests."""
        # Similar pattern to pytest but for unittest
        specification = '''# Generated specification for unittest tests
const specification = (Suite, Given, When, Then) => [
  // Test suites would be generated here
];'''
        
        implementation = '''# Generated implementation for unittest tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};'''
        
        adapter = '''# Generated adapter for unittest tests
const adapter = {
  beforeAll: (input, testResource) => {
    // unittest setUpClass equivalent
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    // unittest setUp equivalent
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    // Execute unittest test method
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    // Execute unittest assertions
    return thenCB(store);
  }
};'''
        
        return {
            "specification": specification,
            "implementation": implementation,
            "adapter": adapter
        }
    
    @staticmethod
    def _generate_behave_components(structure: Dict[str, Any]) -> Dict[str, str]:
        """Generate testeranto components for behave tests."""
        specification = '''# Generated specification for behave tests
const specification = (Suite, Given, When, Then) => [
  // BDD scenarios would be mapped here
];'''
        
        implementation = '''# Generated implementation for behave tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};'''
        
        adapter = '''# Generated adapter for behave tests
const adapter = {
  beforeAll: (input, testResource) => {
    // behave before_all equivalent
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    // behave before_scenario equivalent
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    // Execute behave step
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    // Execute behave assertions
    return thenCB(store);
  }
};'''
        
        return {
            "specification": specification,
            "implementation": implementation,
            "adapter": adapter
        }
    
    @staticmethod
    def _generate_generic_components(structure: Dict[str, Any]) -> Dict[str, str]:
        """Generate testeranto components for generic tests."""
        specification = '''# Generated specification for generic Python tests
const specification = (Suite, Given, When, Then) => [
  // Generic test structure
];'''
        
        implementation = '''# Generated implementation for generic Python tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};'''
        
        adapter = '''# Generated adapter for generic Python tests
const adapter = {
  beforeAll: (input, testResource) => {
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    return thenCB(store);
  }
};'''
        
        return {
            "specification": specification,
            "implementation": implementation,
            "adapter": adapter
        }

def main():
    """Command-line interface for testing."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python native_detection.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = PythonNativeTestDetection.detect_native_test(file_path)
    
    print(json.dumps(result, indent=2))
    
    if result["is_native_test"]:
        translation = PythonNativeTestDetection.translate_to_testeranto(result)
        print("\n--- Generated Specification ---")
        print(translation["specification"])
        print("\n--- Generated Implementation ---")
        print(translation["implementation"])
        print("\n--- Generated Adapter ---")
        print(translation["adapter"])

if __name__ == "__main__":
    main()
