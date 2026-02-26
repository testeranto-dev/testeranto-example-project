require 'json'
require 'fileutils'
require 'pathname'
require 'set'
require 'digest'

puts "hello ruby builder", ARGV.inspect

# project_config_file_path is a ruby file
project_config_file_path = ARGV[0]
ruby_config_file_path = ARGV[1]
test_name = ARGV[2]

# Ensure the config file path is valid before requiring
if File.exist?(project_config_file_path)
  require project_config_file_path
else
  puts "Config file not found: #{project_config_file_path}"
  exit(1)
end

# Load the ruby config to get test entry points
ruby_config = nil
if File.exist?(ruby_config_file_path)
  require ruby_config_file_path
  # Try to get the config constant; assuming it's named after the file
  config_name = File.basename(ruby_config_file_path, '.rb').split('_').map(&:capitalize).join
  if Object.const_defined?(config_name)
    ruby_config = Object.const_get(config_name)
  else
    puts "Warning: Could not find constant #{config_name} in #{ruby_config_file_path}"
    # Fallback: assume the config is assigned to a global variable or just loaded
    # We'll rely on the config being set via some other means
  end
else
  puts "Ruby config file not found: #{ruby_config_file_path}"
  exit(1)
end

# Function to extract dependencies from a Ruby file
def extract_dependencies(file_path, base_dir = Dir.pwd)
  dependencies = Set.new
  visited = Set.new
  
  def follow_dependencies(current_file, deps, visited, base_dir)
    return if visited.include?(current_file)
    visited.add(current_file)
    
    # Add the current file to dependencies if it's a local file
    if File.exist?(current_file) && current_file.start_with?(base_dir)
      deps.add(current_file)
    end
    
    # Read the file and look for require statements
    begin
      content = File.read(current_file)
      
      # Match require, require_relative, and load statements
      # This regex captures the path inside quotes
      content.scan(/(?:require|require_relative|load)\s+(?:\(\s*)?['"]([^'"]+)['"]/) do |match|
        dep_path = match[0]
        
        # Determine the absolute path based on the type of require
        absolute_path = nil
        
        if content.match?(/require_relative\s+(?:\(\s*)?['"]#{Regexp.escape(dep_path)}['"]/)
          # require_relative is relative to the current file
          absolute_path = File.expand_path(dep_path, File.dirname(current_file))
        elsif content.match?(/load\s+(?:\(\s*)?['"]#{Regexp.escape(dep_path)}['"]/)
          # load can be relative or absolute
          if Pathname.new(dep_path).absolute?
            absolute_path = dep_path
          else
            # Try to find in load paths
            $LOAD_PATH.each do |load_path|
              potential_path = File.expand_path(dep_path, load_path)
              if File.exist?(potential_path)
                absolute_path = potential_path
                break
              end
            end
            # If not found in load paths, try relative to current file
            absolute_path ||= File.expand_path(dep_path, File.dirname(current_file))
          end
        else
          # regular require - search in load paths
          $LOAD_PATH.each do |load_path|
            potential_path = File.expand_path(dep_path, load_path)
            # Check for .rb extension
            if File.exist?(potential_path) || File.exist?(potential_path + '.rb')
              absolute_path = File.exist?(potential_path) ? potential_path : potential_path + '.rb'
              break
            end
          end
        end
        
        # If we found a path and it's a local file, follow it
        if absolute_path && File.exist?(absolute_path) && absolute_path.start_with?(base_dir)
          # Add .rb extension if missing
          if !absolute_path.end_with?('.rb') && File.exist?(absolute_path + '.rb')
            absolute_path += '.rb'
          end
          
          follow_dependencies(absolute_path, deps, visited, base_dir)
        end
      end
    rescue => e
      puts "Warning: Could not read or parse #{current_file}: #{e.message}"
    end
  end
  
  follow_dependencies(file_path, dependencies, visited, base_dir)
  dependencies.to_a
end

# Function to convert absolute paths to workspace-relative paths
def to_workspace_relative_paths(files, workspace_root = '/workspace')
  files.map do |file|
    absolute_path = File.expand_path(file)
    if absolute_path.start_with?(workspace_root)
      absolute_path.slice(workspace_root.length..-1)
    else
      # If not under workspace, use relative path from current directory
      Pathname.new(absolute_path).relative_path_from(Pathname.new(Dir.pwd)).to_s
    end
  end
end

# Helper to compute a simple hash from file paths and contents
def compute_files_hash(files)
  require 'digest'
  
  hash = Digest::MD5.new
  
  files.each do |file|
    begin
      if File.exist?(file)
        stats = File.stat(file)
        hash.update(file)
        hash.update(stats.mtime.to_f.to_s)
        hash.update(stats.size.to_s)
      else
        # File may not exist, include its name anyway
        hash.update(file)
        hash.update('missing')
      end
    rescue => error
      # If we can't stat the file, still include its name
      hash.update(file)
      hash.update('error')
    end
  end
  
  hash.hexdigest
end

# Process each test entry point from the config
# Assuming ruby_config has an entryPoints or similar structure
if ruby_config && ruby_config.respond_to?(:entryPoints)
  ruby_config.entryPoints.each do |entry_point|
    # Only process test files (files ending with .test.rb, .spec.rb, etc.)
    next unless entry_point =~ /\.(test|spec)\.rb$/
    
    puts "Processing Ruby test: #{entry_point}"
    
    # Get absolute path to entry point
    entry_point_path = File.expand_path(entry_point)
    
    # Extract all dependencies
    all_dependencies = extract_dependencies(entry_point_path)
    
    # Convert to workspace-relative paths
    workspace_root = '/workspace'
    relative_files = to_workspace_relative_paths(all_dependencies, workspace_root)
    
    # Create output directory structure similar to Node builder
    output_base_name = File.basename(entry_point_path, '.rb')
    input_files_path = "testeranto/bundles/#{output_base_name}.rb-inputFiles.json"
    
    # Ensure directory exists
    FileUtils.mkdir_p(File.dirname(input_files_path))
    
    # Write the input files JSON
    File.write(input_files_path, JSON.pretty_generate(relative_files))
    puts "Wrote #{relative_files.length} input files to #{input_files_path}"
    
    # Compute hash of input files
    files_hash = compute_files_hash(all_dependencies)
    
    # Create the dummy bundle file that requires the original test file
    bundle_path = "testeranto/bundles/#{output_base_name}.rb"
    
    # Write a dummy file that loads and executes the original test file
    # Using load ensures the file is executed every time
    dummy_content = <<~RUBY
      # Dummy bundle file generated by testeranto
      # Hash: #{files_hash}
      # This file loads and executes the original test file: #{entry_point}
      
      # Add the original file's directory to load path if needed
      original_dir = File.dirname('#{entry_point_path}')
      $LOAD_PATH.unshift(original_dir) unless $LOAD_PATH.include?(original_dir)
      
      # Load and execute the original test file
      # Using load instead of require ensures execution every time
      load '#{entry_point_path}'
      
      # If the test framework requires explicit test execution, add it here
      # For example:
      #   TestFramework.run if defined?(TestFramework)
      # This depends on the specific test framework being used
    RUBY
    
    File.write(bundle_path, dummy_content)
    puts "Created dummy bundle file at #{bundle_path}"
  end
else
  puts "Warning: Ruby config doesn't have entryPoints method or config not loaded", ruby_config
  

end

puts "Ruby builder completed"
