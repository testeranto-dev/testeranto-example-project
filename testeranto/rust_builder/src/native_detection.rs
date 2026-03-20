// Native Test Detection and Translation for Rust
use std::env;
use std::fs;
use std::path::Path;
use std::process::Command;
use serde_json::{json, Value};
use std::collections::HashMap;

// Detection result structure
#[derive(Debug)]
struct DetectionResult {
    is_native_test: bool,
    framework_type: String,
    test_structure: HashMap<String, Value>,
}

// Main function for command-line testing
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage: {} <file-path>", args[0]);
        std::process::exit(1);
    }
    
    let file_path = &args[1];
    let result = detect_native_test(file_path)?;
    
    // Output JSON result
    let json_result = json!({
        "isNativeTest": result.is_native_test,
        "frameworkType": result.framework_type,
        "testStructure": result.test_structure
    });
    
    println!("{}", serde_json::to_string_pretty(&json_result)?);
    Ok(())
}

fn detect_native_test(file_path: &str) -> Result<DetectionResult, Box<dyn std::error::Error>> {
    let path = Path::new(file_path);
    
    // Check if file exists
    if !path.exists() {
        return Ok(DetectionResult {
            is_native_test: false,
            framework_type: String::new(),
            test_structure: HashMap::new(),
        });
    }
    
    // Check file extension
    let is_rust_file = path.extension()
        .map(|ext| ext == "rs")
        .unwrap_or(false);
    
    if !is_rust_file {
        return Ok(DetectionResult {
            is_native_test: false,
            framework_type: String::new(),
            test_structure: HashMap::new(),
        });
    }
    
    // Read file content
    let content = fs::read_to_string(file_path)?;
    
    // Check for test attributes
    let has_test_attributes = content.contains("#[test]") || 
                              content.contains("#[cfg(test)]") ||
                              content.contains("#[tokio::test]") ||
                              content.contains("#[async_std::test]");
    
    // Check for test modules
    let has_test_modules = content.contains("#[cfg(test)]") && 
                           (content.contains("mod tests") || content.contains("mod test"));
    
    // Determine framework type
    let framework_type = if content.contains("criterion") {
        "criterion".to_string()
    } else if content.contains("specs") || content.contains("ginkgo") {
        "bdd".to_string()
    } else if has_test_attributes || has_test_modules {
        "rust_testing".to_string()
    } else {
        "unknown".to_string()
    };
    
    // Extract test structure
    let mut test_structure = HashMap::new();
    
    // Collect test functions
    let mut test_functions = Vec::new();
    
    // Simple parsing for #[test] functions
    let lines: Vec<&str> = content.lines().collect();
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        if line.contains("#[test]") || line.contains("#[tokio::test]") || line.contains("#[async_std::test]") {
            // Look for function definition in next lines
            for j in (i + 1)..lines.len() {
                if lines[j].contains("fn ") && lines[j].contains('(') {
                    let func_line = lines[j];
                    // Extract function name
                    if let Some(start) = func_line.find("fn ") {
                        let after_fn = &func_line[start + 3..];
                        if let Some(end) = after_fn.find('(') {
                            let func_name = after_fn[..end].trim().to_string();
                            test_functions.push(json!({
                                "name": func_name,
                                "type": "test",
                                "line": i + 1
                            }));
                        }
                    }
                    break;
                }
            }
        }
        i += 1;
    }
    
    test_structure.insert("testFunctions".to_string(), Value::Array(test_functions));
    
    // Check for dependencies in Cargo.toml
    let mut imports = Vec::new();
    if content.contains("use ") {
        for line in lines {
            if line.contains("use ") {
                imports.push(Value::String(line.trim().to_string()));
            }
        }
    }
    test_structure.insert("imports".to_string(), Value::Array(imports));
    
    let is_native_test = has_test_attributes || has_test_modules;
    
    Ok(DetectionResult {
        is_native_test,
        framework_type,
        test_structure,
    })
}
