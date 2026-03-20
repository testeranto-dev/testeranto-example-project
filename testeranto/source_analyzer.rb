require 'pathname'
require 'set'
require 'prism'

module SourceAnalyzer
  # Extract all dependencies from a Ruby file using AST parsing
  def self.extract_dependencies(file_path, base_dir = Dir.pwd)
    dependencies = Set.new
    visited = Set.new
    
    follow_dependencies(file_path, dependencies, visited, base_dir)
    dependencies.to_a
  end
  
  private
  
  def self.find_actual_file(path)
    # Check if the file exists as-is
    return path if File.exist?(path)
    
    # Check with .rb extension
    rb_path = path.end_with?('.rb') ? path : path + '.rb'
    return rb_path if File.exist?(rb_path)
    
    # Check with other common extensions
    %w[.so .bundle .dll].each do |ext|
      ext_path = path.end_with?(ext) ? path : path + ext
      return ext_path if File.exist?(ext_path)
    end
    
    nil
  end
  
  def self.follow_dependencies(current_file, deps, visited, base_dir)
    return if visited.include?(current_file)
    visited.add(current_file)
    
    # Add the current file to dependencies if it's a local file
    if File.exist?(current_file) && current_file.start_with?(base_dir)
      deps.add(current_file)
    end
    
    # Parse the file with Prism
    begin
      result = Prism.parse_file(current_file)
      
      # Handle empty files
      return unless result.value
      
      # Create visitor and find all require, require_relative, and load calls
      visitor = RequireVisitor.new
      result.value.accept(visitor)
      
      visitor.dependencies.each do |dep|
        type = dep[:type]
        path = dep[:path]
        
        # Skip dynamic paths
        next if path == :dynamic_path
        
        # Determine absolute path based on type
        absolute_path = case type
        when :require_relative
          File.expand_path(path, File.dirname(current_file))
        when :require
          # Search in $LOAD_PATH
          found_path = nil
          $LOAD_PATH.each do |load_path|
            potential_path = File.expand_path(path, load_path)
            actual_file = find_actual_file(potential_path)
            if actual_file
              found_path = actual_file
              break
            end
          end
          found_path || File.expand_path(path, File.dirname(current_file))
        when :load
          if Pathname.new(path).absolute?
            path
          else
            # Try $LOAD_PATH first
            found_path = nil
            $LOAD_PATH.each do |load_path|
              potential_path = File.expand_path(path, load_path)
              actual_file = find_actual_file(potential_path)
              if actual_file
                found_path = actual_file
                break
              end
            end
            found_path || File.expand_path(path, File.dirname(current_file))
          end
        else
          nil
        end
        
        # Find the actual file path
        actual_absolute_path = find_actual_file(absolute_path) if absolute_path
        
        # If we found a path and it's a local file, follow it
        if actual_absolute_path && actual_absolute_path.start_with?(base_dir)
          follow_dependencies(actual_absolute_path, deps, visited, base_dir)
        end
      end
    rescue => e
      # Let errors propagate as requested
      raise "Error parsing #{current_file}: #{e.message}"
    end
  end
  
  # Visitor to find require, require_relative, and load calls
  class RequireVisitor < Prism::Visitor
    attr_reader :dependencies
    
    def initialize
      @dependencies = []
    end
    
    def visit_call_node(node)
      # Check if the method being called is a 'require' variant
      # node.name should be a symbol like :require, :require_relative, or :load
      method_name = node.name
      if method_name.is_a?(Symbol) && %i[require require_relative load].include?(method_name)
        # Extract the first argument if it's a static string
        arg = node.arguments&.arguments&.first
        if arg.is_a?(Prism::StringNode)
          @dependencies << { type: method_name, path: arg.content }
        else
          @dependencies << { type: method_name, path: :dynamic_path }
        end
      end
      # Continue walking the tree
      visit_child_nodes(node)
    end
    
  end
  
  # Convert absolute paths to workspace-relative paths
  def self.to_workspace_relative_paths(files, workspace_root = '/workspace')
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
  
  # Compute a hash from file paths and contents
  def self.compute_files_hash(files)
    require 'digest'
    
    hash = Digest::MD5.new
    
    files.each do |file|
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
    end
    
    hash.hexdigest
  end
end
