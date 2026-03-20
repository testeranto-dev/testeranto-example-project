// The rust builder
// runs in a docker image and produces built rust tests

use std::env;
use std::fs;
use std::path::Path;
use std::process::Command;
use serde_json;
use std::collections::HashMap;
#[cfg(unix)]
use std::os::unix::process::ExitStatusExt;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Rust builder starting...");
    
    // Parse command line arguments
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 4 {
        eprintln!("❌ Insufficient arguments");
        eprintln!("Usage: {} <project_config> <rust_config> <config_key> <entry_points...>", args[0]);
        std::process::exit(1);
    }
    
    let _project_config_file_path = &args[1];
    let _rust_config_file_path = &args[2];
    let config_key = &args[3];
    let entry_points = &args[4..];
    
    println!("Config key: {}", config_key);
    println!("Entry points: {:?}", entry_points);
    
    if entry_points.is_empty() {
        eprintln!("❌ No entry points provided");
        std::process::exit(1);
    }
    
    // Change to workspace directory
    let workspace = Path::new("/workspace");
    env::set_current_dir(workspace)?;
    
    // The Rust project is in src/rust/, not at workspace root
    // Check if we're in a Cargo project by looking in src/rust/
    let rust_project_dir = workspace.join("src/rust");
    let cargo_toml_path = rust_project_dir.join("Cargo.toml");
    
    if !cargo_toml_path.exists() {
        // Try to find Cargo.toml in the workspace root as fallback
        let root_cargo_toml = workspace.join("Cargo.toml");
        if root_cargo_toml.exists() {
            println!("📁 Found Cargo.toml at workspace root");
        } else {
            eprintln!("❌ Not a Cargo project: Cargo.toml not found in src/rust/ or workspace root");
            eprintln!("   Looking for: {}", cargo_toml_path.display());
            eprintln!("   Also tried: {}", root_cargo_toml.display());
            std::process::exit(1);
        }
    } else {
        // Change to the Rust project directory
        env::set_current_dir(&rust_project_dir)?;
        println!("📁 Changed to Rust project directory: {}", rust_project_dir.display());
    }
    
    // Create bundles directory
    let bundles_dir = workspace.join("testeranto/bundles").join(config_key);
    fs::create_dir_all(&bundles_dir)?;
    
    // Create a map to store all tests' information
    let mut all_tests_info: HashMap<String, serde_json::Value> = HashMap::new();
    
    // Check if we can build the main project (but don't include test files)
    // First, check if there's a Cargo.toml and it's valid
    println!("🔨 Checking Cargo project...");
    let check_status = Command::new("cargo")
        .args(&["check", "--release", "--bins"])
        .status();
    
    match check_status {
        Ok(status) => {
            if !status.success() {
                println!("⚠️  Cargo check had issues, but continuing with test builds");
            }
        }
        Err(_) => {
            println!("⚠️  Cargo check failed, but continuing anyway");
        }
    }
    
    // Process each entry point
    for entry_point in entry_points {
        println!("\n📦 Processing Rust test: {}", entry_point);
        
        // Get entry point path - entry_point is relative to workspace root
        let entry_point_path = workspace.join(entry_point);
        if !entry_point_path.exists() {
            eprintln!("  ❌ Entry point does not exist: {}", entry_point_path.display());
            std::process::exit(1);
        }
        
        // Get base name for binary
        let file_name = entry_point_path.file_name()
            .unwrap_or_default()
            .to_str()
            .unwrap_or("");
        if !file_name.ends_with(".rs") {
            eprintln!("  ❌ Entry point is not a Rust file: {}", entry_point);
            std::process::exit(1);
        }
        
        // Create a valid crate name: replace dots and slashes with underscores
        // Also ensure it starts with a letter and contains only alphanumeric characters or underscores
        let binary_name = entry_point
            .replace("/", "_")
            .replace(".", "_")
            .replace("-", "_");
        // Ensure the name is valid for Rust crate
        let valid_binary_name = binary_name
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '_')
            .collect::<String>();
        
        // Detect if this is a native test
        let is_native_test = detect_native_test(&entry_point_path);
        let framework_type = if is_native_test {
            "rust_testing".to_string()
        } else {
            "unknown".to_string()
        };
        
        if is_native_test {
            println!("  Detected native Rust test (framework: {})", framework_type);
            // Generate Go-compatible wrapper for native Rust tests
            generate_go_compatible_wrapper(&entry_point_path, &bundles_dir, &valid_binary_name, &framework_type);
        }
        
        // Collect input files
        let input_files = collect_input_files(&entry_point_path, workspace);
        
        // Compute hash
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        for file in &input_files {
            file.hash(&mut hasher);
        }
        let hash = hasher.finish();
        let hash_str = format!("{:x}", hash);
        
        // Store test information
        let test_info = serde_json::json!({
            "hash": hash_str,
            "files": input_files,
            "isNativeTest": is_native_test,
            "frameworkType": framework_type
        });
        all_tests_info.insert(entry_point.to_string(), test_info);
        
        // Instead of building a separate binary, we'll use the existing Rust project
        // and build the specific test binary that's already defined in Cargo.toml
        
        // The entry point is a Rust source file that should already be part of the project
        // We need to determine which binary target it corresponds to
        
        // First, check if the entry point exists
        if !entry_point_path.exists() {
            eprintln!("  ❌ Entry point does not exist: {}", entry_point_path.display());
            std::process::exit(1);
        }
        
        // Get the binary name from the entry point path
        // The Rust project already has binary targets defined in Cargo.toml
        // We need to find which binary corresponds to this source file
        
        // Read the Cargo.toml to find binary targets
        let cargo_toml_content = fs::read_to_string("Cargo.toml")?;
        
        // Simple parsing to find [[bin]] sections
        let mut binary_targets = Vec::new();
        let lines: Vec<&str> = cargo_toml_content.lines().collect();
        let mut in_bin_section = false;
        let mut current_bin_name = None;
        let mut current_bin_path = None;
        
        for line in lines {
            let trimmed = line.trim();
            if trimmed.starts_with("[[bin]]") {
                in_bin_section = true;
                current_bin_name = None;
                current_bin_path = None;
            } else if in_bin_section && trimmed.starts_with("name =") {
                current_bin_name = Some(trimmed.trim_start_matches("name =").trim().trim_matches('"'));
            } else if in_bin_section && trimmed.starts_with("path =") {
                current_bin_path = Some(trimmed.trim_start_matches("path =").trim().trim_matches('"'));
            } else if trimmed.starts_with('[') && !trimmed.starts_with("[[") {
                // New section starting
                if in_bin_section {
                    if let (Some(name), Some(path)) = (current_bin_name, current_bin_path) {
                        binary_targets.push((name.to_string(), path.to_string()));
                    }
                    in_bin_section = false;
                }
            }
        }
        
        // Check last section
        if in_bin_section {
            if let (Some(name), Some(path)) = (current_bin_name, current_bin_path) {
                binary_targets.push((name.to_string(), path.to_string()));
            }
        }
        
        println!("  📋 Found {} binary targets in Cargo.toml", binary_targets.len());
        
        // Try to find which binary target matches our entry point
        let mut matching_binary = None;
        for (bin_name, bin_path) in &binary_targets {
            let absolute_bin_path = Path::new(bin_path);
            if absolute_bin_path == entry_point_path || 
               absolute_bin_path.canonicalize().ok() == entry_point_path.canonicalize().ok() {
                matching_binary = Some(bin_name.clone());
                break;
            }
        }
        
        // If no exact match, try to find by filename
        if matching_binary.is_none() {
            let entry_filename = entry_point_path.file_name().unwrap_or_default().to_str().unwrap_or("");
            for (bin_name, bin_path) in &binary_targets {
                let path = Path::new(bin_path);
                if path.file_name().unwrap_or_default() == entry_filename {
                    matching_binary = Some(bin_name.clone());
                    break;
                }
            }
        }
        
        let binary_name = if let Some(bin) = matching_binary {
            println!("  🔍 Found matching binary target: {}", bin);
            bin
        } else {
            // Create a binary name from the entry point path
            let name = entry_point
                .replace("/", "_")
                .replace(".", "_")
                .replace("-", "_");
            // Ensure valid Rust identifier
            let valid_name: String = name.chars()
                .filter(|c| c.is_alphanumeric() || *c == '_')
                .collect();
            println!("  ⚠️  No matching binary target found, using generated name: {}", valid_name);
            valid_name
        };
        
        // Build the specific binary
        println!("  🔨 Building binary: {}...", binary_name);
        let build_status = Command::new("cargo")
            .args(&["build", "--release", "--bin", &binary_name])
            .status()?;
        
        if !build_status.success() {
            eprintln!("  ❌ Failed to build binary: {}", binary_name);
            // Try to get more info
            let _ = Command::new("cargo")
                .args(&["build", "--release", "--bin", &binary_name, "--verbose"])
                .status();
            std::process::exit(1);
        }
        
        // Copy the binary to bundles directory
        let source_bin = Path::new("target/release").join(&binary_name);
        if !source_bin.exists() {
            // Try with .exe extension
            let source_bin_exe = source_bin.with_extension("exe");
            if source_bin_exe.exists() {
                let dest_bin = bundles_dir.join(&binary_name).with_extension("exe");
                fs::copy(&source_bin_exe, &dest_bin)?;
                make_executable(&dest_bin)?;
                println!("  ✅ Compiled binary at: {:?}", dest_bin);
            } else {
                eprintln!("  ❌ Compiled binary not found at {:?} or {:?}", source_bin, source_bin_exe);
                // List target/release directory
                let _ = Command::new("ls")
                    .args(&["-la", "target/release/"])
                    .status();
                std::process::exit(1);
            }
        } else {
            let dest_bin = bundles_dir.join(&binary_name);
            fs::copy(&source_bin, &dest_bin)?;
            make_executable(&dest_bin)?;
            println!("  ✅ Compiled binary at: {:?}", dest_bin);
        }
    }
    
    // Write single inputFiles.json for all tests
    let input_files_path = bundles_dir.join("inputFiles.json");
    fs::write(&input_files_path, serde_json::to_string_pretty(&all_tests_info)?)?;
    println!("\n✅ Created inputFiles.json at {:?} with {} tests", input_files_path, all_tests_info.len());
    
    println!("\n🎉 Rust builder completed successfully");
    Ok(())
}

fn collect_input_files(test_path: &Path, workspace: &Path) -> Vec<String> {
    let mut files = Vec::new();
    
    // Get the current directory (should be src/rust/)
    let current_dir = env::current_dir().unwrap_or_else(|_| workspace.to_path_buf());
    
    // Add the test file itself
    if let Ok(relative) = test_path.strip_prefix(workspace) {
        files.push(relative.to_string_lossy().to_string());
    } else if let Ok(relative) = test_path.strip_prefix(&current_dir) {
        // If test_path is relative to current directory (src/rust/)
        files.push(format!("src/rust/{}", relative.to_string_lossy()));
    } else {
        files.push(test_path.to_string_lossy().to_string());
    }
    
    // Add Cargo.toml (relative to current directory)
    let cargo_toml = current_dir.join("Cargo.toml");
    if cargo_toml.exists() {
        if let Ok(relative) = cargo_toml.strip_prefix(workspace) {
            files.push(relative.to_string_lossy().to_string());
        } else {
            files.push("src/rust/Cargo.toml".to_string());
        }
    }
    
    // Add Cargo.lock if present
    let cargo_lock = current_dir.join("Cargo.lock");
    if cargo_lock.exists() {
        if let Ok(relative) = cargo_lock.strip_prefix(workspace) {
            files.push(relative.to_string_lossy().to_string());
        } else {
            files.push("src/rust/Cargo.lock".to_string());
        }
    }
    
    // Add all .rs files in the same directory as the test
    if let Some(parent) = test_path.parent() {
        if let Ok(entries) = fs::read_dir(parent) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map(|e| e == "rs").unwrap_or(false) {
                    if let Ok(relative) = path.strip_prefix(workspace) {
                        files.push(relative.to_string_lossy().to_string());
                    } else if let Ok(relative) = path.strip_prefix(&current_dir) {
                        files.push(format!("src/rust/{}", relative.to_string_lossy()));
                    }
                }
            }
        }
    }
    
    // Add src/ directory files (relative to current Rust project)
    let src_dir = current_dir.join("src");
    if src_dir.exists() {
        collect_rs_files_recursive(&src_dir, workspace, &mut files);
    }
    
    files
}

fn collect_rs_files_recursive(dir: &Path, workspace: &Path, files: &mut Vec<String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_rs_files_recursive(&path, workspace, files);
            } else if path.extension().map(|e| e == "rs").unwrap_or(false) {
                // Try to get path relative to workspace
                if let Ok(relative) = path.strip_prefix(workspace) {
                    files.push(relative.to_string_lossy().to_string());
                } else {
                    // Try to get path relative to current directory
                    let current_dir = env::current_dir().unwrap_or_else(|_| workspace.to_path_buf());
                    if let Ok(relative) = path.strip_prefix(&current_dir) {
                        files.push(format!("src/rust/{}", relative.to_string_lossy()));
                    } else {
                        // Fallback to absolute path
                        files.push(path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
}

fn detect_native_test(file_path: &Path) -> bool {
    // Simple detection: check for #[test] attributes
    if let Ok(content) = fs::read_to_string(file_path) {
        content.contains("#[test]") || 
        content.contains("#[cfg(test)]") ||
        content.contains("#[tokio::test]") ||
        content.contains("#[async_std::test]")
    } else {
        false
    }
}

fn generate_go_compatible_wrapper(
    test_file_path: &Path,
    bundles_dir: &Path,
    binary_name: &str,
    framework_type: &str,
) {
    // Create a Go wrapper that can execute the Rust binary
    let wrapper_path = bundles_dir.join(format!("{}_go_wrapper.go", binary_name));
    
    let wrapper_content = format!(r#"// Go-compatible wrapper for Rust test
// Original test: {}
// Framework: {}

package main

import (
    "fmt"
    "os"
    "os/exec"
    "path/filepath"
    "encoding/json"
)

type TestResult struct {{
    Name   string `json:"name"`
    Passed bool   `json:"passed"`
    Output string `json:"output,omitempty"`
}}

func main() {{
    // Get the path to the Rust binary
    exePath := filepath.Join(filepath.Dir(os.Args[0]), "{}")
    
    // Check if binary exists
    if _, err := os.Stat(exePath); os.IsNotExist(err) {{
        // Try with .exe extension
        exePath = exePath + ".exe"
        if _, err := os.Stat(exePath); os.IsNotExist(err) {{
            fmt.Fprintf(os.Stderr, "Rust binary not found: %s\n", exePath)
            os.Exit(1)
        }}
    }}
    
    // Execute the Rust binary
    cmd := exec.Command(exePath)
    output, err := cmd.CombinedOutput()
    
    result := TestResult{{
        Name:   "{}",
        Passed: err == nil,
        Output: string(output),
    }}
    
    // Output JSON result for Go test runner
    jsonResult, jsonErr := json.Marshal(result)
    if jsonErr != nil {{
        fmt.Fprintf(os.Stderr, "Failed to marshal result: %v\n", jsonErr)
        os.Exit(1)
    }}
    
    fmt.Println(string(jsonResult))
    
    if err != nil {{
        os.Exit(1)
    }}
}}
"#, 
        test_file_path.display(), 
        framework_type,
        binary_name,
        binary_name
    );
    
    if let Err(e) = fs::write(&wrapper_path, wrapper_content) {
        eprintln!("  ⚠️  Failed to generate Go wrapper: {}", e);
        return;
    }
    
    println!("  ✅ Generated Go-compatible wrapper for Rust test");
    
    // Also create a simple Rust test runner that outputs JSON
    let rust_runner_path = bundles_dir.join(format!("{}_runner.rs", binary_name));
    let rust_runner_content = format!(r#"// Rust test runner for Go compatibility
use std::process::Command;
use std::env;
use serde_json::json;

fn main() {{
    // Run the actual test binary
    let current_exe = env::current_exe().expect("Failed to get current executable path");
    let test_binary = current_exe.with_file_name("{}");
    
    let output = Command::new(test_binary)
        .output()
        .expect("Failed to execute test binary");
    
    // Create JSON result
    let result = json!({{
        "name": "{}",
        "passed": output.status.success(),
        "output": String::from_utf8_lossy(&output.stdout),
        "error": String::from_utf8_lossy(&output.stderr),
    }});
    
    println!("{{}}", result);
    
    // Exit with appropriate code
    std::process::exit(if output.status.success() {{ 0 }} else {{ 1 }});
}}
"#,
        binary_name,
        binary_name
    );
    
    if let Err(e) = fs::write(&rust_runner_path, rust_runner_content) {
        eprintln!("  ⚠️  Failed to generate Rust runner: {}", e);
    }
}

fn make_executable(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(path)?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(path, perms)?;
    }
    #[cfg(windows)]
    {
        // Windows doesn't have executable permissions in the same way
        // Just ensure the file exists
    }
    Ok(())
}
