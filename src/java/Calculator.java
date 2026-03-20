package testeranto_example_project.java;

public class Calculator {
    private String display = "";
    private java.util.Map<String, Object> values = new java.util.HashMap<>();

    public void enter() {
        try {
            // Simple expression evaluation
            // Note: Using ScriptEngine for evaluation
            javax.script.ScriptEngineManager manager = new javax.script.ScriptEngineManager();
            javax.script.ScriptEngine engine = manager.getEngineByName("JavaScript");
            Object result = engine.eval(this.display);
            this.display = result.toString();
        } catch (Exception error) {
            this.display = "Error";
            throw new RuntimeException(error);
        }
    }

    public void memoryStore() {
        try {
            double value = Double.parseDouble(this.display);
            this.setValue("memory", value);
            this.clear();
        } catch (NumberFormatException e) {
            this.setValue("memory", 0.0);
            this.clear();
        }
    }

    public void memoryRecall() {
        Object memoryValue = this.getValue("memory");
        if (memoryValue instanceof Number) {
            this.display = memoryValue.toString();
        } else {
            this.display = "0";
        }
    }

    public void memoryClear() {
        this.setValue("memory", 0.0);
    }

    public void memoryAdd() {
        try {
            double currentValue = Double.parseDouble(this.display);
            Object memoryValue = this.getValue("memory");
            double memory = 0.0;
            if (memoryValue instanceof Number) {
                memory = ((Number) memoryValue).doubleValue();
            }
            this.setValue("memory", memory + currentValue);
            this.clear();
        } catch (NumberFormatException e) {
            this.clear();
        }
    }

    public boolean handleSpecialButton(String button) {
        switch (button) {
            case "C":
                this.clear();
                return true;
            case "MS":
                this.memoryStore();
                return true;
            case "MR":
                this.memoryRecall();
                return true;
            case "MC":
                this.memoryClear();
                return true;
            case "M+":
                this.memoryAdd();
                return true;
            default:
                return false;
        }
    }

    public Calculator press(String button) {
        // Handle special buttons first
        if (this.handleSpecialButton(button)) {
            return this;
        }

        // For regular buttons, append to display
        this.display = this.display + button;
        return this;
    }

    public String getDisplay() {
        return this.display;
    }

    public void clear() {
        this.display = "";
    }

    // Keep these methods for backward compatibility if needed
    public double add(double a, double b) {
        return a + b;
    }

    public double subtract(double a, double b) {
        return a - b;
    }

    public double multiply(double a, double b) {
        return a * b;
    }

    public double divide(double a, double b) {
        if (b == 0) {
            throw new ArithmeticException("Cannot divide by zero");
        }
        return a / b;
    }

    public void setValue(String identifier, Object value) {
        this.values.put(identifier, value);
    }

    public Object getValue(String identifier) {
        return this.values.getOrDefault(identifier, null);
    }
}
