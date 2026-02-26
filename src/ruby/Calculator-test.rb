require 'json'
require 'rubeno'
require_relative './Calculator'

puts "=== Calculator-test.rb loaded ==="
puts "hello calculator test - using Rubeno"

# Define test implementation
test_implementation = Rubeno::ITestImplementation.new(
  suites: {
    'Default' => { description: "Default test suite for Calculator" }
  },
  givens: {
    'Default' => ->(initial_values) do
      Calculator.new
    end
  },
  whens: {
    'press' => ->(button) do
      ->(calculator) do
        calculator.press(button)
        calculator
      end
    end,
    'enter' => ->() do
      ->(calculator) do
        calculator.equals
        calculator
      end
    end,
    'memoryStore' => ->() do
      ->(calculator) do
        calculator.memory_store
        calculator
      end
    end,
    'memoryRecall' => ->() do
      ->(calculator) do
        calculator.memory_recall
        calculator
      end
    end,
    'memoryClear' => ->() do
      ->(calculator) do
        calculator.memory_clear
        calculator
      end
    end,
    'memoryAdd' => ->() do
      ->(calculator) do
        calculator.memory_add
        calculator
      end
    end
  },
  thens: {
    'result' => ->(expected) do
      ->(calculator) do
        actual = calculator.get_display
        if actual == expected
          true
        else
          raise "Expected display '#{expected}', got '#{actual}'"
        end
      end
    end
  }
)

# Define test specification
test_specification = ->(suites, givens, whens, thens) do
  # Use the provided wrappers directly
  # Build the test specification
  [
    suites.Default('Testing Calculator operations', {
      'testEmptyDisplay' => givens.Default(
        ['pressing nothing, the display is empty'],
        [],
        [thens.result('')],
        nil
      ),
      'testSingleDigit' => givens.Default(
        ['entering a number puts it on the display'],
        [whens.press('2')],
        [thens.result('2')],
        nil
      ),
      'testMultipleDigits' => givens.Default(
        ['entering multiple digits concatenates them'],
        [whens.press('2'), whens.press('2')],
        [thens.result('22')],
        nil
      ),
      'testAdditionExpression' => givens.Default(
        ['addition expression is displayed correctly'],
        [whens.press('2'), whens.press('+'), whens.press('3')],
        [thens.result('2+3')],
        nil
      ),
      'testSimpleAddition' => givens.Default(
        ['simple addition calculation'],
        [
          whens.press('2'), whens.press('3'), whens.press('+'),
          whens.press('4'), whens.press('5'), whens.enter()
        ],
        [thens.result('68')],
        nil
      ),
      'testMemoryStoreRecall' => givens.Default(
        ['memory store and recall'],
        [
          whens.press('1'), whens.press('2'), whens.press('3'),
          whens.memoryStore(), 
          whens.press('C'), 
          whens.memoryRecall()
        ],
        [thens.result('123')],
        nil
      )
    })
  ]
end

# Create Rubeno instance
rubeno_instance = Rubeno.Rubeno(
  nil,  # input
  test_specification,
  test_implementation,
  Rubeno::SimpleTestAdapter.new,
  Rubeno::ITTestResourceRequest.new(ports: 1000)
)

# Set as default instance
Rubeno.set_default_instance(rubeno_instance)

puts "Rubeno instance configured successfully"

# Check if a test resource configuration was passed via command line
if ARGV[0] && !ARGV[0].empty?
  puts "Using command-line argument for test resource configuration"
  config_json = ARGV[0]
  puts "Config JSON from command line: #{config_json}"
  
  # Run tests with the provided configuration
  begin
    result = rubeno_instance.receiveTestResourceConfig(config_json)
    puts "Tests completed with #{result.fails} failures"
    puts "Result features: #{result.features}"
    puts "Result artifacts: #{result.artifacts}"
    puts "Result failed?: #{result.failed}"
  rescue => e
    puts "Error running tests: #{e.message}"
    puts e.backtrace
  end
  
  # Exit after running tests (don't continue to Rubeno.main)
  exit(result.fails) if defined?(result) && result.respond_to?(:fails)
else
  puts "No command-line argument provided. Tests will be run via Rubeno.main if executed directly."
  
  # If this file is being run directly (not loaded), call Rubeno.main
  # But we need to provide a default config
  if __FILE__ == $0
    puts "Running via __FILE__ == $0, calling Rubeno.main with default config"
    # Create a default test resource configuration
    default_config = {
      name: 'calculator-test',
      fs: '.',
      ports: [],
      timeout: 30000,
      retries: 0,
      environment: {}
    }.to_json
    ARGV.replace([default_config])
    Rubeno.main
  end
end
