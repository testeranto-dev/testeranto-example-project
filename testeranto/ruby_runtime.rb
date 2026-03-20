#!/usr/bin/env ruby
# Ruby builder that uses native detection
# This is a simplified version that delegates to native_detection.rb

require 'json'
require 'fileutils'

puts "Ruby builder starting with native detection..."

if ARGV.length < 3
  puts "Usage: ruby ruby.rb <project_config_path> <ruby_config_path> <test_name> [entry_points...]"
  exit 1
end

project_config_file_path = ARGV[0]
ruby_config_file_path = ARGV[1]
test_name = ARGV[2]
entry_points = ARGV[3..-1]

# Load and parse configuration if needed
begin
  if File.exist?(project_config_file_path)
    project_config = JSON.parse(File.read(project_config_file_path))
    puts "Loaded project config"
  end
rescue => e
  puts "Warning: Could not parse project config: #{e.message}"
end

begin
  if File.exist?(ruby_config_file_path)
    ruby_config = JSON.parse(File.read(ruby_config_file_path))
    puts "Loaded Ruby config"
  end
rescue => e
  puts "Warning: Could not parse Ruby config: #{e.message}"
end

# Delegate to native detection
require_relative 'native_detection'

detector = RubyNativeDetection.new(
  project_config_file_path,
  ruby_config_file_path,
  test_name,
  entry_points
)

detector.run

puts "Ruby builder completed successfully"
