"""
Calculator test file for pitono.
This file contains tests for the Calculator class.
"""
import sys
import os
import asyncio
import importlib.util

print("This is a simple console message.")

# Add the current directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Import Calculator from the current directory
from Calculator import Calculator

# Load the required modules from the same directory using absolute paths
spec_path = os.path.join(current_dir, 'Calculator.pitono.specification.py')
spec_spec = importlib.util.spec_from_file_location("specification", spec_path)
spec_module = importlib.util.module_from_spec(spec_spec)
spec_spec.loader.exec_module(spec_module)
specification = spec_module.specification

impl_path = os.path.join(current_dir, 'Calculator.pitono.implementation.py')
impl_spec = importlib.util.spec_from_file_location("implementation", impl_path)
impl_module = importlib.util.module_from_spec(impl_spec)
impl_spec.loader.exec_module(impl_module)
implementation = impl_module.implementation

adapter_path = os.path.join(current_dir, 'Calculator.pitono.adapter.py')
adapter_spec = importlib.util.spec_from_file_location("SimpleTestAdapter", adapter_path)
adapter_module = importlib.util.module_from_spec(adapter_spec)
adapter_spec.loader.exec_module(adapter_module)
SimpleTestAdapter = adapter_module.SimpleTestAdapter

# Import from installed testeranto-pitono package
# The distribution name is "testeranto-pitono" which becomes "testeranto_pitono" when imported
try:
    from testeranto_pitono import Pitono, set_default_instance, main
    print("Successfully imported testeranto_pitono from PyPI package 'testeranto-pitono'")
except ImportError as e:
    print(f"Error importing testeranto_pitono: {e}")
    print("\nThe 'testeranto-pitono' package is not installed or has import issues.")
    print("\nTo install from local source:")
    print("  cd testerantoV2/src/lib/pitono/")
    print("  pip install -e .")
    print("\nOr from PyPI:")
    print("  pip install testeranto-pitono==0.1.15")
    print("\nAfter installation, verify with:")
    print("  python -c 'import testeranto_pitono; print(\"Import successful\")'")
    sys.exit(1)

# Create a mock input value (not used in our case)
mock_input = None

# Create the test instance
try:
    test_instance = Pitono(
        mock_input,
        specification,
        implementation,
        SimpleTestAdapter(),
        {"ports": 1}
    )
    # Set it as the default instance
    set_default_instance(test_instance)
    print("Test instance created successfully")
except Exception as e:
    print(f"Error creating test instance: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Run the main function if this file is executed directly
if __name__ == "__main__":
    print("Starting Calculator tests...")
    
    if len(sys.argv) >= 3:
        asyncio.run(main())
    else:
        # Run in standalone mode for debugging
        print("Running in standalone mode...")

        # Create a simple test resource configuration
        # The fs path should include the test filename as a directory (without .py extension)
        test_name = "Calculator.pitono.test"
        test_resource_config = {
            "name": "local-test",
            "fs": f"testeranto/reports/python/{test_name}",
            "ports": [8080],
            "browser_ws_endpoint": None,
            "timeout": 30000,
            "retries": 0,
            "environment": {}
        }
        
        import json
        config_json = json.dumps(test_resource_config)
        # Keep the original sys.argv[0] as the script name
        sys.argv = [sys.argv[0], config_json, 'ipcfile']
        print(f"Running with sys.argv: {sys.argv}")
        
        try:
            asyncio.run(main())
        except Exception as e:
            print(f"Error running tests: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
