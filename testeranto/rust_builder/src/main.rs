// The rust builder
// runs in a docker image and produces built rust tests

use std::env;
use std::fs;
use std::path::Path;
use std::process::Command;
use serde_json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Rust builder starting...");
    
    // Parse command line arguments
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 4 {
        eprintln!("❌ Insufficient arguments");
        eprintln!("Usage: {} <project_config> <rust_config> <test_name> <entry_points...>", args[0]);
        std::process::exit(1);
    }
    
    let project_config_file_path = &args[1];
    let rust_config_file_path = &args[2];
    let test_name = &args[3];
    let entry_points = &args[4..];
    
    println!("Test name: {}", test_name);
    println!("Entry points: {:?}", entry_points);
    
    if entry_points.is_empty() {
        eprintln!("❌ No entry points provided");
        std::process::exit(1);
    }
    
    // Change to workspace directory
    let workspace = Path::new("/workspace");
    env::set_current_dir(workspace)?;
    
    // Check if we're in a Cargo project
    let cargo_toml_path = workspace.join("Cargo.toml");
    if !cargo_toml_path.exists() {
        eprintln!("❌ Not a Cargo project: Cargo.toml not found");
        std::process::exit(1);
    }
    
    // Create bundles directory
    let bundles_dir = workspace.join("testeranto/bundles").join(test_name);
    fs::create_dir_all(&bundles_dir)?;
    
    // Process each entry point
    for entry_point in entry_points {
        println!("\n📦 Processing Rust test: {}", entry_point);
        
        // Get entry point path
        let entry_point_path = Path::new(entry_point);
        if !entry_point_path.exists() {
            eprintln!("  ❌ Entry point does not exist: {}", entry_point);
            std::process::exit(1);
        }
        
        // Get base name (without .rs extension)
        let file_name = entry_point_path.file_name()
            .unwrap_or_default()
            .to_str()
            .unwrap_or("");
        if !file_name.ends_with(".rs") {
            eprintln!("  ❌ Entry point is not a Rust file: {}", entry_point);
            std::process::exit(1);
        }
        let base_name_with_dots = &file_name[..file_name.len() - 3];
        // Replace dots with underscores to make a valid Rust crate name
        let base_name: String = base_name_with_dots.replace('.', "_");
        
        // Create inputFiles.json
        let input_files = collect_input_files(entry_point_path);
        let input_files_basename = entry_point.replace("/", "_").replace("\\", "_") + "-inputFiles.json";
        let input_files_path = bundles_dir.join(input_files_basename);
        fs::write(&input_files_path, serde_json::to_string_pretty(&input_files)?)?;
        println!("  ✅ Created inputFiles.json");
        
        // Create a temporary directory for this test
        let temp_dir = workspace.join("target").join("testeranto_temp").join(&base_name);
        fs::create_dir_all(&temp_dir)?;
        
        // Create Cargo.toml with necessary dependencies
        let cargo_toml_content = format!(r#"[package]
name = "{}"
version = "0.1.0"
edition = "2021"

[dependencies]
testeranto_rusto = "0.1"
serde = {{ version = "1.0", features = ["derive"] }}
tokio = {{ version = "1.0", features = ["full"] }}
serde_json = "1.0"
"#, base_name);
        
        fs::write(temp_dir.join("Cargo.toml"), cargo_toml_content)?;
        
        // Create src directory and copy the test file as main.rs
        let src_dir = temp_dir.join("src");
        fs::create_dir_all(&src_dir)?;
        fs::copy(entry_point_path, src_dir.join("main.rs"))?;
        
        println!("  📝 Created temporary Cargo project");
        
        // Compile the binary
        println!("  🔨 Compiling with cargo...");
        let status = Command::new("cargo")
            .current_dir(&temp_dir)
            .args(&["build", "--release"])
            .status()?;
        
        if !status.success() {
            eprintln!("  ❌ Cargo build failed for {}", base_name);
            std::process::exit(1);
        }
        
        // Source binary path (cargo output)
        let source_bin = temp_dir.join("target/release").join(&base_name);
        if !source_bin.exists() {
            eprintln!("  ❌ Compiled binary not found at {:?}", source_bin);
            std::process::exit(1);
        }
        
        // Destination binary path in bundle directory
        let dest_bin = bundles_dir.join(&base_name);
        fs::copy(&source_bin, &dest_bin)?;
        
        // Make executable
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&dest_bin)?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&dest_bin, perms)?;
        }
        
        println!("  ✅ Compiled binary at: {:?}", dest_bin);
        
        // Create dummy bundle file (for consistency with other runtimes)
        let dummy_path = bundles_dir.join(entry_point);
        if let Some(parent) = dummy_path.parent() {
            fs::create_dir_all(parent)?;
        }
        
        let dummy_content = format!(r#"#!/usr/bin/env bash
# Dummy bundle file generated by testeranto
# This file execs the compiled Rust binary

exec "{}/{}" "$@"
"#, bundles_dir.display(), &base_name);
        
        fs::write(&dummy_path, dummy_content)?;
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&dummy_path)?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&dummy_path, perms)?;
        }
        
        println!("  ✅ Created dummy bundle file");
        
        // Clean up: remove temporary directory
        let _ = fs::remove_dir_all(temp_dir);
    }
    
    println!("\n🎉 Rust builder completed successfully");
    Ok(())
}

fn collect_input_files(test_path: &Path) -> Vec<String> {
    let mut files = Vec::new();
    let workspace = Path::new("/workspace");
    
    // Add the test file itself
    if let Ok(relative) = test_path.strip_prefix(workspace) {
        files.push(relative.to_string_lossy().to_string());
    } else {
        files.push(test_path.to_string_lossy().to_string());
    }
    
    // Add Cargo.toml
    let cargo_toml = workspace.join("Cargo.toml");
    if cargo_toml.exists() {
        files.push("Cargo.toml".to_string());
    }
    
    // Add Cargo.lock if present
    let cargo_lock = workspace.join("Cargo.lock");
    if cargo_lock.exists() {
        files.push("Cargo.lock".to_string());
    }
    
    // Add all .rs files in src/ directory
    let src_dir = workspace.join("src");
    if src_dir.exists() {
        if let Ok(entries) = fs::read_dir(src_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map(|e| e == "rs").unwrap_or(false) {
                    if let Ok(relative) = path.strip_prefix(workspace) {
                        files.push(relative.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    
    files
}
