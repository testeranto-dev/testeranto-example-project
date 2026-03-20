#!/usr/bin/env ruby
# Ruby native detection for test frameworks
# Similar to testeranto-example-project/testeranto/runtimes/node/native_detection.js

require 'json'
require 'pathname'
require 'fileutils'

class RubyNativeDetection
  def initialize(project_config_path, ruby_config_path, test_name, entry_points)
    @project_config_path = project_config_path
    @ruby_config_path = ruby_config_path
    @test_name = test_name
    @entry_points = entry_points
    @all_tests_info = {}
  end

  def run
    puts "Ruby native detection starting..."
    puts "Test name: #{@test_name}"
    puts "Entry points: #{@entry_points.inspect}"

    # Load framework converters
    require_relative 'framework-converters'

    @entry_points.each do |entry_point|
      puts "Processing Ruby test: #{entry_point}"
      
      # Get absolute path to entry point
      entry_point_path = File.expand_path(entry_point)
      
      # Extract all dependencies using SourceAnalyzer
      all_dependencies = SourceAnalyzer.extract_dependencies(entry_point_path)
      
      # Convert to workspace-relative paths
      workspace_root = '/workspace'
      relative_files = SourceAnalyzer.to_workspace_relative_paths(all_dependencies, workspace_root)
      
      # Compute hash of input files
      files_hash = SourceAnalyzer.compute_files_hash(all_dependencies)
      
      # Detect the appropriate framework converter
      converter = FrameworkConverters.detect_converter(entry_point_path)
      puts "Detected framework: #{converter.name} for #{entry_point}"
      
      # Store test information with framework detection
      @all_tests_info[entry_point] = {
        "hash" => files_hash,
        "files" => relative_files,
        "framework" => converter.name
      }
      
      # Create detection result for translation
      detection_result = {
        framework_type: converter.name,
        file_path: entry_point_path,
        test_structure: {
          # This would be populated by more sophisticated analysis
          test_suites: [
            {
              name: 'Default',
              test_cases: [
                { name: File.basename(entry_point_path, '.rb') }
              ]
            }
          ]
        }
      }
      
      # Generate framework-specific wrapper
      wrapper_content = converter.generate_wrapper(
        entry_point_path,
        detection_result,
        {},  # translation_result would be populated by translate_to_testeranto
        files_hash
      )
      
      # Create the bundle file with framework-specific wrapper
      bundle_path = "testeranto/bundles/#{@test_name}/#{entry_point}"
      
      # Ensure directory exists
      FileUtils.mkdir_p(File.dirname(bundle_path))
      
      File.write(bundle_path, wrapper_content)
      puts "Created #{converter.name} wrapper at #{bundle_path}"
      
      # Optionally generate testeranto translation
      # translation = converter.translate_to_testeranto(detection_result)
      # translation_path = "testeranto/bundles/#{@test_name}/#{File.basename(entry_point, '.rb')}_translation.rb"
      # File.write(translation_path, "#{translation[:specification]}\n\n#{translation[:implementation]}\n\n#{translation[:adapter]}")
      # puts "Generated translation at #{translation_path}"
    end

    # Write single inputFiles.json for all tests
    input_files_path = "testeranto/bundles/#{@test_name}/inputFiles.json"
    FileUtils.mkdir_p(File.dirname(input_files_path))
    File.write(input_files_path, JSON.pretty_generate(@all_tests_info))
    puts "Wrote inputFiles.json for #{@all_tests_info.size} tests to #{input_files_path}"

    puts "Ruby native detection completed with framework detection"
  end
end

# Main execution
if __FILE__ == $0
  if ARGV.length < 3
    puts "Usage: ruby native_detection.rb <project_config_path> <ruby_config_path> <test_name> [entry_points...]"
    exit 1
  end

  project_config_file_path = ARGV[0]
  ruby_config_file_path = ARGV[1]
  test_name = ARGV[2]
  entry_points = ARGV[3..-1]

  detector = RubyNativeDetection.new(
    project_config_file_path,
    ruby_config_file_path,
    test_name,
    entry_points
  )
  
  detector.run
end
