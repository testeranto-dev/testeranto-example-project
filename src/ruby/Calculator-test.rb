require 'json'
require 'rubeno'
require_relative './Calculator'

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
  # Create a wrapper object that responds to method calls for suites
  suite_wrapper = Object.new
  suite_wrapper.define_singleton_method(:Default) do |name, givens_dict|
    {
      'name' => name,
      'givens' => givens_dict
    }
  end
  
  # Create wrapper objects for givens, whens, thens
  given_wrapper = Object.new
  given_wrapper.define_singleton_method(:Default) do |features, when_steps, then_steps, initial_values|
    givens['Default'].call(features, when_steps, then_steps, initial_values)
  end
  
  when_wrapper = Object.new
  test_implementation.whens.each do |key, proc|
    when_wrapper.define_singleton_method(key) do |*args|
      proc.call(*args)
    end
  end
  
  then_wrapper = Object.new
  test_implementation.thens.each do |key, proc|
    then_wrapper.define_singleton_method(key) do |*args|
      proc.call(*args)
    end
  end
  
  # Build the test specification
  [
    suite_wrapper.Default('Testing Calculator operations', {
      'testEmptyDisplay' => given_wrapper.Default(
        ['pressing nothing, the display is empty'],
        [],
        [then_wrapper.result('')],
        nil
      ),
      'testSingleDigit' => given_wrapper.Default(
        ['entering a number puts it on the display'],
        [when_wrapper.press('2')],
        [then_wrapper.result('2')],
        nil
      ),
      'testMultipleDigits' => given_wrapper.Default(
        ['entering multiple digits concatenates them'],
        [when_wrapper.press('2'), when_wrapper.press('2')],
        [then_wrapper.result('22')],
        nil
      ),
      'testAdditionExpression' => given_wrapper.Default(
        ['addition expression is displayed correctly'],
        [when_wrapper.press('2'), when_wrapper.press('+'), when_wrapper.press('3')],
        [then_wrapper.result('2+3')],
        nil
      ),
      'testSimpleAddition' => given_wrapper.Default(
        ['simple addition calculation'],
        [
          when_wrapper.press('2'), when_wrapper.press('3'), when_wrapper.press('+'),
          when_wrapper.press('4'), when_wrapper.press('5'), when_wrapper.enter()
        ],
        [then_wrapper.result('68')],
        nil
      ),
      'testMemoryStoreRecall' => given_wrapper.Default(
        ['memory store and recall'],
        [
          when_wrapper.press('1'), when_wrapper.press('2'), when_wrapper.press('3'),
          when_wrapper.memoryStore(), 
          when_wrapper.press('C'), 
          when_wrapper.memoryRecall()
        ],
        [then_wrapper.result('123')],
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

# If this file is being run directly, execute the tests
if __FILE__ == $0
  # Rubeno.main expects command line arguments
  # The first argument should be a JSON string with test resource configuration
  config = {
    name: 'calculator-test',
    fs: '.',
    ports: [],
    timeout: 30000,
    retries: 0,
    environment: {}
  }.to_json
  
  # Call Rubeno.main with the configuration
  ARGV.replace([config])
  Rubeno.main
end
