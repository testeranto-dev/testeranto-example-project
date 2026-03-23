import React, { useState, useEffect } from 'react';
import { Calculator } from './Calculator.js';

interface CalculatorUIProps {
  initialValue?: string;
}

const CalculatorUI: React.FC<CalculatorUIProps> = ({ initialValue = '' }) => {
  const [calculator, setCalculator] = useState<Calculator>(new Calculator());
  const [display, setDisplay] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);

  // Initialize calculator
  useEffect(() => {
    const calc = new Calculator();
    if (initialValue) {
      // Press each character of initial value
      initialValue.split('').forEach(char => {
        calc.press(char);
      });
    }
    setCalculator(calc);
    setDisplay(calc.getDisplay());
  }, [initialValue]);

  // Update display when calculator changes
  useEffect(() => {
    setDisplay(calculator.getDisplay());
  }, [calculator]);

  const handleButtonClick = (button: string) => {
    const newCalc = new Calculator();
    
    // Copy current calculator state
    // We need to recreate the calculator with current display
    // This is a limitation of the Calculator class design
    const currentDisplay = calculator.getDisplay();
    
    // Create a new calculator and press all the current display characters
    // This is not ideal but works for the demo
    // A better Calculator class would have a way to set state
    if (currentDisplay) {
      currentDisplay.split('').forEach(char => {
        newCalc.press(char);
      });
    }
    
    // Press the new button
    newCalc.press(button);
    
    setCalculator(newCalc);
    
    // Add to history
    setHistory(prev => [...prev, `${currentDisplay} → ${button} → ${newCalc.getDisplay()}`]);
  };

  const handleEnter = () => {
    const newCalc = new Calculator();
    const currentDisplay = calculator.getDisplay();
    
    // Copy current state
    if (currentDisplay) {
      currentDisplay.split('').forEach(char => {
        newCalc.press(char);
      });
    }
    
    // Press enter
    newCalc.enter();
    
    setCalculator(newCalc);
    setHistory(prev => [...prev, `ENTER: ${currentDisplay} → ${newCalc.getDisplay()}`]);
  };

  const handleMemory = (operation: 'MS' | 'MR' | 'MC' | 'M+') => {
    const newCalc = new Calculator();
    const currentDisplay = calculator.getDisplay();
    
    // Copy current state
    if (currentDisplay) {
      currentDisplay.split('').forEach(char => {
        newCalc.press(char);
      });
    }
    
    // Perform memory operation
    switch (operation) {
      case 'MS':
        newCalc.memoryStore();
        break;
      case 'MR':
        newCalc.memoryRecall();
        break;
      case 'MC':
        newCalc.memoryClear();
        break;
      case 'M+':
        newCalc.memoryAdd();
        break;
    }
    
    setCalculator(newCalc);
    setHistory(prev => [...prev, `${operation}: ${currentDisplay} → ${newCalc.getDisplay()}`]);
  };

  const handleClear = () => {
    const newCalc = new Calculator();
    setCalculator(newCalc);
    setHistory(prev => [...prev, `CLEAR: ${calculator.getDisplay()} → `]);
  };

  const buttonRows = [
    ['7', '8', '9', '/', 'C'],
    ['4', '5', '6', '*', '('],
    ['1', '2', '3', '-', ')'],
    ['0', '.', '=', '+', 'MS'],
  ];

  const memoryButtons = [
    { label: 'MR', operation: 'MR' as const },
    { label: 'MC', operation: 'MC' as const },
    { label: 'M+', operation: 'M+' as const },
  ];

  return (
    <div style={styles.container}>
      <h2>React Calculator</h2>
      
      <div style={styles.calculator}>
        {/* Display */}
        <div style={styles.display}>
          <div style={styles.displayValue}>{display || '0'}</div>
        </div>
        
        {/* Memory buttons */}
        <div style={styles.memorySection}>
          <div style={styles.memoryLabel}>Memory:</div>
          <div style={styles.memoryButtons}>
            {memoryButtons.map((btn) => (
              <button
                key={btn.label}
                style={styles.memoryButton}
                onClick={() => handleMemory(btn.operation)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Main buttons */}
        <div style={styles.buttonGrid}>
          {buttonRows.map((row, rowIndex) => (
            <div key={rowIndex} style={styles.buttonRow}>
              {row.map((button) => {
                if (button === '=') {
                  return (
                    <button
                      key={button}
                      style={styles.enterButton}
                      onClick={handleEnter}
                    >
                      {button}
                    </button>
                  );
                } else if (button === 'C') {
                  return (
                    <button
                      key={button}
                      style={styles.clearButton}
                      onClick={handleClear}
                    >
                      {button}
                    </button>
                  );
                } else {
                  return (
                    <button
                      key={button}
                      style={styles.button}
                      onClick={() => handleButtonClick(button)}
                    >
                      {button}
                    </button>
                  );
                }
              })}
            </div>
          ))}
        </div>
        
        {/* History */}
        <div style={styles.historySection}>
          <h4>Operation History:</h4>
          <div style={styles.historyList}>
            {history.length === 0 ? (
              <div style={styles.noHistory}>No operations yet</div>
            ) : (
              history.map((item, index) => (
                <div key={index} style={styles.historyItem}>
                  {item}
                </div>
              ))
            )}
          </div>
          {history.length > 0 && (
            <button
              style={styles.clearHistoryButton}
              onClick={() => setHistory([])}
            >
              Clear History
            </button>
          )}
        </div>
      </div>
      
      {/* Calculator state info */}
      <div style={styles.infoSection}>
        <h4>Calculator State:</h4>
        <div>Display: {display || '(empty)'}</div>
        <div>Memory Value: {calculator.getValue('memory') || '0'}</div>
        <div>Expression: {calculator.getDisplay() || '(empty)'}</div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '400px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '10px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  calculator: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  display: {
    backgroundColor: '#222',
    color: '#0f0',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '15px',
    textAlign: 'right' as const,
    fontFamily: 'monospace',
    fontSize: '24px',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  displayValue: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  memorySection: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '5px',
  },
  memoryLabel: {
    fontWeight: 'bold' as const,
    marginRight: '10px',
  },
  memoryButtons: {
    display: 'flex',
    gap: '5px',
  },
  memoryButton: {
    padding: '8px 12px',
    backgroundColor: '#4a6fa5',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  buttonGrid: {
    marginBottom: '20px',
  },
  buttonRow: {
    display: 'flex',
    gap: '5px',
    marginBottom: '5px',
  },
  button: {
    flex: 1,
    padding: '15px',
    fontSize: '18px',
    backgroundColor: '#e0e0e0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  enterButton: {
    flex: 1,
    padding: '15px',
    fontSize: '18px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  clearButton: {
    flex: 1,
    padding: '15px',
    fontSize: '18px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  historySection: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f9f9f9',
    borderRadius: '5px',
  },
  historyList: {
    maxHeight: '150px',
    overflowY: 'auto' as const,
    marginBottom: '10px',
  },
  historyItem: {
    padding: '5px',
    borderBottom: '1px solid #eee',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  noHistory: {
    color: '#888',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    padding: '10px',
  },
  clearHistoryButton: {
    padding: '8px 12px',
    backgroundColor: '#888',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '15px',
    fontSize: '14px',
  },
};

export default CalculatorUI;
export { CalculatorUI };
