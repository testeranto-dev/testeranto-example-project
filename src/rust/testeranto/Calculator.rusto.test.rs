//! Rust test binary for Calculator
//! This should be compiled and executed by the testeranto framework
//! Similar to TypeScript's Calculator.test.node.ts

mod calculator_impl {
    include!("Calculator.rusto.implementation.rs");
}

use calculator_impl::Calculator;
use serde_json;
use std::env;
use std::fs;
use std::path::Path;

fn main() {
    // Get command line arguments
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Error: Test resource configuration JSON required as first argument");
        eprintln!("Usage: {} <test_resource_config_json>", args[0]);
        std::process::exit(1);
    }
    
    let config_json = &args[1];
    
    // Parse the configuration
    let config: serde_json::Value = match serde_json::from_str(config_json) {
        Ok(config) => config,
        Err(e) => {
            eprintln!("Error parsing JSON configuration: {}", e);
            std::process::exit(1);
        }
    };
    
    // Extract the report directory from the configuration
    let report_dir = config["fs"]
        .as_str()
        .unwrap_or(".")
        .trim_end_matches('/');
    
    // Run the actual tests
    let test_results = run_calculator_tests();
    
    // Ensure the report directory exists
    if let Err(e) = fs::create_dir_all(report_dir) {
        eprintln!("Error creating report directory '{}': {}", report_dir, e);
        std::process::exit(1);
    }
    
    // Write the test results
    let report_path = Path::new(report_dir).join("tests.json");
    match serde_json::to_string_pretty(&test_results) {
        Ok(json_str) => {
            if let Err(e) = fs::write(&report_path, json_str) {
                eprintln!("Error writing test results to '{}': {}", report_path.display(), e);
                std::process::exit(1);
            }
            println!("Test results written to {}", report_path.display());
        }
        Err(e) => {
            eprintln!("Error serializing test results: {}", e);
            std::process::exit(1);
        }
    }
}

fn run_calculator_tests() -> serde_json::Value {
    println!("Running Calculator tests...");
    
    let mut all_passed = true;
    let mut failures = 0;
    let mut features = Vec::new();
    
    // Test 1: Basic number input
    {
        let mut calc = Calculator::new();
        calc.press("1").press("2").press("3");
        if calc.get_display() == "123" {
            println!("✓ Basic number input");
            features.push("basic_number_input".to_string());
        } else {
            eprintln!("✗ Basic number input failed");
            all_passed = false;
            failures += 1;
        }
    }
    
    // Test 2: Clear operation
    {
        let mut calc = Calculator::new();
        calc.press("1").press("2").press("3").press("C");
        if calc.get_display() == "" {
            println!("✓ Clear operation");
            features.push("clear_operation".to_string());
        } else {
            eprintln!("✗ Clear operation failed");
            all_passed = false;
            failures += 1;
        }
    }
    
    // Test 3: Memory operations
    {
        let mut calc = Calculator::new();
        calc.press("4").press("5").press("6").press("MS").press("C").press("MR");
        if calc.get_display() == "456" {
            println!("✓ Memory store and recall");
            features.push("memory_operations".to_string());
        } else {
            eprintln!("✗ Memory operations failed");
            all_passed = false;
            failures += 1;
        }
    }
    
    // Return test results in the format expected by testeranto
    serde_json::json!({
        "failed": !all_passed,
        "fails": failures,
        "artifacts": [],
        "features": features,
        "tests": 3,
        "runTimeTests": 3,
        "testJob": {
            "name": "Calculator Tests",
            "description": "BDD tests for Calculator implementation"
        }
    })
}
