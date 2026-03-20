# Standard RSpec test for Calculator
require_relative '../../src/ruby/Calculator'

RSpec.describe Calculator do
  before(:each) do
    @calc = Calculator.new
  end

  describe '#initial display' do
    it 'should be empty' do
      expect(@calc.get_display).to eq('')
    end
  end

  describe '#single digit' do
    it 'should display the digit' do
      @calc.press('2')
      expect(@calc.get_display).to eq('2')
    end
  end

  describe '#multiple digits' do
    it 'should concatenate digits' do
      @calc.press('2')
      @calc.press('2')
      expect(@calc.get_display).to eq('22')
    end
  end

  describe '#addition' do
    it 'should add numbers' do
      @calc.press('2')
      @calc.press('+')
      @calc.press('3')
      @calc.enter
      expect(@calc.get_display).to eq('5')
    end
  end

  describe '#subtraction' do
    it 'should subtract numbers' do
      @calc.press('9')
      @calc.press('5')
      @calc.press('-')
      @calc.press('3')
      @calc.press('2')
      @calc.enter
      expect(@calc.get_display).to eq('63')
    end
  end

  describe '#multiplication' do
    it 'should multiply numbers' do
      @calc.press('6')
      @calc.press('*')
      @calc.press('7')
      @calc.enter
      expect(@calc.get_display).to eq('42')
    end
  end

  describe '#clear' do
    it 'should clear the display' do
      @calc.press('1')
      @calc.press('2')
      @calc.press('3')
      @calc.press('C')
      @calc.press('4')
      expect(@calc.get_display).to eq('4')
    end
  end

  describe '#decimal' do
    it 'should handle decimal numbers' do
      @calc.press('3')
      @calc.press('.')
      @calc.press('1')
      @calc.press('4')
      expect(@calc.get_display).to eq('3.14')
    end
  end

  describe '#division by zero' do
    it 'should show Error' do
      @calc.press('5')
      @calc.press('/')
      @calc.press('0')
      @calc.enter
      expect(@calc.get_display).to eq('Error')
    end
  end
end
