// Calculator State
let currentExpression = '0';
let angleMode = 'DEG';
let memory = 0;
let variables = {
    'pi': 3.141592653589793,
    'e': 2.718281828459045
};
let calculationHistory = [];
let isAssigning = false;
let tempVariableName = '';
let selectedVariable = null;

// Initialize calculator
function initializeCalculator() {
    updateDisplay();
    updateVariablesDisplay();
    updateModeDisplay();
    addToHistory('Calculator Ready - Type expressions or click buttons');
}

// Display Functions
function updateDisplay() {
    document.getElementById('expression').textContent = currentExpression;
}

function updateResult(value) {
    const resultElement = document.getElementById('result');
    resultElement.textContent = value;
    
    if (value === 'Error') {
        resultElement.className = 'result error';
    } else if (value === 'Calculating...') {
        resultElement.className = 'result calculating';
    } else {
        resultElement.className = 'result';
    }
}

function updateModeDisplay() {
    document.getElementById('angleMode').textContent = `MODE: ${angleMode}`;
    document.getElementById('angleBtn').textContent = angleMode;
    document.getElementById('varCount').textContent = `VARS: ${Object.keys(variables).length}`;
    document.getElementById('memoryStatus').textContent = `MEM: ${memory}`;
}

// Expression Handling
function appendToDisplay(value) {
    if (isAssigning) {
        handleVariableAssignment(value);
        return;
    }
    
    if (currentExpression === '0') {
        if (value === '.' || !isNaN(value) || value === '(' || 
            value === 'x' || value === 'y' || value === 'z') {
            currentExpression = value;
        } else if (value === 'sin(' || value === 'cos(' || value === 'tan(' || 
                   value === 'log(' || value === 'ln(' || value === 'sqrt(' || 
                   value === 'exp(' || value === 'abs(' || value === 'pow(' || 
                   value === 'INT(' || value === 'MOD(' || value === 'INV(' || 
                   value === 'ROUND(' || value === 'inc(' || value === 'dec(') {
            currentExpression = value;
        } else {
            currentExpression += value;
        }
    } else {
        currentExpression += value;
    }
    updateDisplay();
}

// FIXED: Append constant - show value when clicked alone, calculate when in expression
function appendConstant(constant) {
    if (isAssigning) {
        handleVariableAssignment(constant);
        return;
    }
    
    // If current expression is just '0' or empty, show the constant value
    if (currentExpression === '0' || currentExpression === '') {
        currentExpression = constant;
        updateDisplay();
        
        // Show the constant value immediately
        if (constant === 'pi') {
            updateResult('3.141592653589793');
        } else if (constant === 'e') {
            updateResult('2.718281828459045');
        }
    } else {
        // If there's already an expression, append the constant and calculate
        currentExpression += constant;
        updateDisplay();
        
        // Try to calculate the expression with the constant
        try {
            calculate();
        } catch (error) {
            // If calculation fails, just show the constant value
            if (constant === 'pi') {
                updateResult('3.141592653589793');
            } else if (constant === 'e') {
                updateResult('2.718281828459045');
            }
        }
    }
}

// Clear functions
function clearDisplay() {
    currentExpression = '0';
    updateDisplay();
    updateResult('0');
    isAssigning = false;
    tempVariableName = '';
}

function clearAll() {
    currentExpression = '0';
    updateDisplay();
    updateResult('0');
    isAssigning = false;
    tempVariableName = '';
    addToHistory('Display cleared');
}

function backspace() {
    if (isAssigning) {
        if (tempVariableName.length > 0) {
            tempVariableName = tempVariableName.slice(0, -1);
            updateResult(tempVariableName ? `Store in ${tempVariableName}` : 'Enter var name');
        } else {
            isAssigning = false;
            tempVariableName = '';
            updateResult('0');
            currentExpression = '0';
            updateDisplay();
        }
    } else {
        if (currentExpression.length > 1) {
            currentExpression = currentExpression.slice(0, -1);
        } else {
            currentExpression = '0';
        }
        updateDisplay();
    }
}

// Angle Mode Switching
function switchAngleMode() {
    angleMode = angleMode === 'RAD' ? 'DEG' : 'RAD';
    updateModeDisplay();
    addToHistory(`Switched to ${angleMode} mode`);
}

// Calculation Engine
function calculate() {
    try {
        if (currentExpression === '0' || currentExpression === '') {
            updateResult('0');
            return;
        }
        
        updateResult('Calculating...');
        
        setTimeout(() => {
            try {
                let expression = currentExpression;
                
                console.log('Original expression:', expression);
                
                // Step 1: Handle variable assignments in expression (e.g., "x=5")
                expression = processVariableAssignments(expression);
                
                // Step 2: Replace variables with their values
                expression = replaceVariablesWithValues(expression);
                
                // Step 3: Add implicit multiplication
                expression = addImplicitMultiplication(expression);
                
                // Step 4: Replace display symbols
                expression = expression.replace(/×/g, '*');
                
                // Step 5: Handle trigonometric functions
                if (angleMode === 'DEG') {
                    expression = expression.replace(/sin\(([^)]+)\)/g, 'sinDeg($1)');
                    expression = expression.replace(/cos\(([^)]+)\)/g, 'cosDeg($1)');
                    expression = expression.replace(/tan\(([^)]+)\)/g, 'tanDeg($1)');
                } else {
                    expression = expression.replace(/sin\(/g, 'Math.sin(');
                    expression = expression.replace(/cos\(/g, 'Math.cos(');
                    expression = expression.replace(/tan\(/g, 'Math.tan(');
                }
                
                // Step 6: Replace other functions
                expression = expression.replace(/sqrt\(/g, 'Math.sqrt(');
                expression = expression.replace(/log\(/g, 'Math.log10(');
                expression = expression.replace(/ln\(/g, 'Math.log(');
                expression = expression.replace(/exp\(/g, 'Math.exp(');
                expression = expression.replace(/abs\(/g, 'Math.abs(');
                expression = expression.replace(/pow\(/g, 'Math.pow(');
                expression = expression.replace(/INT\(/g, 'Math.floor(');
                expression = expression.replace(/MOD\(/g, 'mod(');
                expression = expression.replace(/INV\(/g, 'inv(');
                expression = expression.replace(/ROUND\(/g, 'Math.round(');
                expression = expression.replace(/inc\(/g, 'increment(');
                expression = expression.replace(/dec\(/g, 'decrement(');
                
                // Step 7: Replace power operator (^ to **)
                expression = expression.replace(/\^/g, '**');
                
                // Step 8: Replace constants - FIXED: Use word boundaries to avoid partial matches
                expression = expression.replace(/\bpi\b/g, 'Math.PI');
                expression = expression.replace(/\be\b/g, 'Math.E');
                
                // Step 9: Handle factorial
                expression = expression.replace(/(\d+)!/g, function(match, num) {
                    return `factorial(${num})`;
                });
                
                console.log('Processed expression:', expression);
                
                // Step 10: Evaluate the expression
                const result = safeEvaluate(expression);
                
                console.log('Calculation result:', result);
                
                // Add to history
                addToHistory(`${currentExpression} = ${formatResult(result)}`);
                
                // Update displays - KEEP expression visible, show result below
                updateResult(formatResult(result));
                // Don't change currentExpression - keep it visible
                updateDisplay();
                
            } catch (error) {
                console.error('Calculation error:', error);
                updateResult('Error');
                addToHistory(`Error in: ${currentExpression}`);
            }
        }, 50);
        
    } catch (error) {
        console.error('General error:', error);
        updateResult('Error');
        addToHistory(`Error: ${currentExpression}`);
    }
}

// Process variable assignments in expressions (e.g., "x=5")
function processVariableAssignments(expr) {
    // Check if expression contains variable assignment (e.g., "x=5")
    const assignmentMatch = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.+)$/);
    if (assignmentMatch) {
        const varName = assignmentMatch[1];
        const varValue = assignmentMatch[2];
        
        try {
            // Evaluate the value part
            let valueExpr = varValue;
            valueExpr = replaceVariablesWithValues(valueExpr);
            valueExpr = addImplicitMultiplication(valueExpr);
            valueExpr = valueExpr.replace(/×/g, '*').replace(/\^/g, '**');
            
            const value = safeEvaluate(valueExpr);
            
            // Store the variable
            variables[varName] = value;
            updateVariablesDisplay();
            updateModeDisplay();
            
            addToHistory(`✅ ${varName} = ${formatResult(value)}`);
            
            // Return the value for display
            return value.toString();
        } catch (error) {
            throw new Error(`Invalid variable assignment: ${expr}`);
        }
    }
    return expr;
}

// Replace variables with their values
function replaceVariablesWithValues(expr) {
    let result = expr;
    
    // Replace all variable names with their values
    Object.keys(variables).forEach(varName => {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        result = result.replace(regex, variables[varName]);
    });
    
    return result;
}

// FIXED: Improved implicit multiplication to handle constants better
function addImplicitMultiplication(expr) {
    let result = expr;
    
    // Number followed by function
    const functions = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'exp', 'abs', 'pow', 'INT', 'MOD', 'INV', 'ROUND', 'inc', 'dec'];
    functions.forEach(func => {
        result = result.replace(new RegExp(`(\\d)(${func}\\()`, 'g'), '$1*$2');
    });
    
    // Number followed by constant - FIXED: Better regex for constants
    result = result.replace(/(\d)(pi)/g, '$1*$2');
    result = result.replace(/(\d)(e)/g, '$1*$2');
    
    // Number followed by opening parenthesis
    result = result.replace(/(\d)(\()/g, '$1*$2');
    
    // Closing parenthesis followed by number or function
    result = result.replace(/(\))(\d)/g, '$1*$2');
    functions.forEach(func => {
        result = result.replace(new RegExp(`(\\))(${func}\\()`, 'g'), '$1*$2');
    });
    
    // Constant followed by function
    functions.forEach(func => {
        result = result.replace(new RegExp(`(pi)(${func}\\()`, 'g'), '$1*$2');
        result = result.replace(new RegExp(`(e)(${func}\\()`, 'g'), '$1*$2');
    });
    
    // Constant followed by opening parenthesis
    result = result.replace(/(pi)(\()/g, '$1*$2');
    result = result.replace(/(e)(\()/g, '$1*$2');
    
    return result;
}

// Safe evaluation
function safeEvaluate(expr) {
    const context = {
        Math: Math,
        sinDeg: (angle) => Math.sin((angle * Math.PI) / 180),
        cosDeg: (angle) => Math.cos((angle * Math.PI) / 180),
        tanDeg: (angle) => {
            const rad = (angle * Math.PI) / 180;
            const result = Math.tan(rad);
            return Math.abs(result) > 1e10 ? (result > 0 ? Infinity : -Infinity) : result;
        },
        mod: (a, b) => {
            if (b === 0) throw new Error("Modulus by zero");
            return a % b;
        },
        inv: (x) => {
            if (x === 0) throw new Error("Division by zero");
            return 1 / x;
        },
        increment: (x) => x + 1,
        decrement: (x) => x - 1,
        factorial: (n) => {
            n = parseInt(n);
            if (n < 0) throw new Error("Factorial requires non-negative integer");
            if (n === 0 || n === 1) return 1;
            let result = 1;
            for (let i = 2; i <= n; i++) {
                result *= i;
            }
            return result;
        }
    };
    
    try {
        const func = new Function(...Object.keys(context), `return ${expr};`);
        return func(...Object.values(context));
    } catch (error) {
        throw new Error(`Evaluation error: ${error.message}`);
    }
}

// Custom calculation functions
function calculateCustom() {
    const customExpr = document.getElementById('customExpr').value;
    if (customExpr) {
        currentExpression = customExpr;
        updateDisplay();
        calculate();
        // Don't clear the custom input - let user see what they typed
    }
}

// Calculate two expressions
function calculateTwoExpressions() {
    const expr1 = document.getElementById('expr1').value;
    const expr2 = document.getElementById('expr2').value;
    
    if (!expr1 && !expr2) {
        addToHistory('❌ Please enter at least one expression');
        return;
    }
    
    let historyEntry = '';
    let finalResult = '';
    
    try {
        // Calculate first expression if provided
        if (expr1) {
            const tempExpr = currentExpression;
            currentExpression = expr1;
            const result1 = safeEvaluateExpression(expr1);
            historyEntry += `Expr1: ${expr1} = ${result1}`;
            finalResult = result1;
            
            // Update display with first result
            updateResult(formatResult(result1));
        }
        
        // Calculate second expression if provided
        if (expr2) {
            const result2 = safeEvaluateExpression(expr2);
            if (historyEntry) historyEntry += ' | ';
            historyEntry += `Expr2: ${expr2} = ${result2}`;
            finalResult = result2;
            
            // Update display with final result
            updateResult(formatResult(result2));
        }
        
        addToHistory(`🔢 ${historyEntry}`);
        
        // Clear inputs after successful calculation
        document.getElementById('expr1').value = '';
        document.getElementById('expr2').value = '';
        
    } catch (error) {
        addToHistory(`❌ Error in two-expression calculation: ${error.message}`);
    }
}

// Helper function for safe evaluation of expressions
function safeEvaluateExpression(expr) {
    let expression = expr;
    
    // Handle variable assignments
    expression = processVariableAssignments(expression);
    
    // Replace variables with their values
    expression = replaceVariablesWithValues(expression);
    
    // Add implicit multiplication
    expression = addImplicitMultiplication(expression);
    
    // Replace display symbols
    expression = expression.replace(/×/g, '*');
    
    // Handle trigonometric functions
    if (angleMode === 'DEG') {
        expression = expression.replace(/sin\(([^)]+)\)/g, 'sinDeg($1)');
        expression = expression.replace(/cos\(([^)]+)\)/g, 'cosDeg($1)');
        expression = expression.replace(/tan\(([^)]+)\)/g, 'tanDeg($1)');
    } else {
        expression = expression.replace(/sin\(/g, 'Math.sin(');
        expression = expression.replace(/cos\(/g, 'Math.cos(');
        expression = expression.replace(/tan\(/g, 'Math.tan(');
    }
    
    // Replace other functions
    expression = expression.replace(/sqrt\(/g, 'Math.sqrt(');
    expression = expression.replace(/log\(/g, 'Math.log10(');
    expression = expression.replace(/ln\(/g, 'Math.log(');
    expression = expression.replace(/exp\(/g, 'Math.exp(');
    expression = expression.replace(/abs\(/g, 'Math.abs(');
    expression = expression.replace(/pow\(/g, 'Math.pow(');
    expression = expression.replace(/INT\(/g, 'Math.floor(');
    expression = expression.replace(/MOD\(/g, 'mod(');
    expression = expression.replace(/INV\(/g, 'inv(');
    expression = expression.replace(/ROUND\(/g, 'Math.round(');
    expression = expression.replace(/inc\(/g, 'increment(');
    expression = expression.replace(/dec\(/g, 'decrement(');
    
    // Replace power operator
    expression = expression.replace(/\^/g, '**');
    
    // Replace constants
    expression = expression.replace(/\bpi\b/g, 'Math.PI');
    expression = expression.replace(/\be\b/g, 'Math.E');
    
    // Handle factorial
    expression = expression.replace(/(\d+)!/g, function(match, num) {
        return `factorial(${num})`;
    });
    
    return safeEvaluate(expression);
}

// Assign variable from custom section
function assignVariable() {
    const varName = document.getElementById('varName').value;
    const varValue = document.getElementById('varValue').value;
    
    if (!varName || !varValue) {
        addToHistory('❌ Please enter both variable name and value');
        return;
    }
    
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
        addToHistory('❌ Invalid variable name');
        return;
    }
    
    try {
        // Evaluate the value
        const value = safeEvaluateExpression(varValue);
        
        // Store the variable
        variables[varName] = value;
        updateVariablesDisplay();
        updateModeDisplay();
        
        addToHistory(`✅ ${varName} = ${formatResult(value)}`);
        
        // Clear inputs
        document.getElementById('varName').value = '';
        document.getElementById('varValue').value = '';
        
    } catch (error) {
        addToHistory(`❌ Error assigning variable: ${error.message}`);
    }
}

// Edit selected variable
function editSelectedVariable() {
    if (!selectedVariable) {
        addToHistory('❌ Please select a variable first');
        return;
    }
    
    const newValue = prompt(`Enter new value for ${selectedVariable}:`, variables[selectedVariable]);
    if (newValue !== null) {
        try {
            const value = safeEvaluateExpression(newValue);
            variables[selectedVariable] = value;
            updateVariablesDisplay();
            addToHistory(`✏️ Edited ${selectedVariable} = ${formatResult(value)}`);
        } catch (error) {
            addToHistory(`❌ Error editing variable: ${error.message}`);
        }
    }
}

// Delete selected variable
function deleteSelectedVariable() {
    if (!selectedVariable) {
        addToHistory('❌ Please select a variable first');
        return;
    }
    
    if (selectedVariable === 'pi' || selectedVariable === 'e') {
        addToHistory('❌ Cannot delete built-in constants pi and e');
        return;
    }
    
    if (confirm(`Are you sure you want to delete variable '${selectedVariable}'?`)) {
        const varName = selectedVariable;
        delete variables[selectedVariable];
        selectedVariable = null;
        updateVariablesDisplay();
        updateModeDisplay();
        addToHistory(`🗑️ Deleted variable ${varName}`);
    }
}

// Formatting
function formatResult(value) {
    if (typeof value !== 'number') return value;
    
    if (value === Infinity) return '∞';
    if (value === -Infinity) return '-∞';
    if (isNaN(value)) return 'NaN';
    
    if (Math.abs(value) < 1e-10) return '0';
    if (Math.abs(value) > 1e10) return value.toExponential(6);
    if (Math.abs(value - Math.round(value)) < 1e-10) return Math.round(value).toString();
    
    const rounded = Math.round(value * 1e10) / 1e10;
    return parseFloat(rounded.toString()).toString();
}

// History Management
function addToHistory(entry) {
    calculationHistory.unshift(entry);
    if (calculationHistory.length > 10) calculationHistory.pop();
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyElement = document.getElementById('history');
    historyElement.innerHTML = calculationHistory
        .map(entry => `<div class="history-item">${entry}</div>`)
        .join('');
}

function clearHistory() {
    calculationHistory = [];
    updateHistoryDisplay();
    addToHistory('History cleared');
}

// Variable Management
function prepareAssignment() {
    const currentResult = document.getElementById('result').textContent;
    if (currentResult !== '0' && currentResult !== 'Error' && !isNaN(parseFloat(currentResult))) {
        isAssigning = true;
        tempVariableName = '';
        updateResult('Enter variable name');
    } else {
        addToHistory('Please calculate a result first before assigning');
    }
}

function handleVariableAssignment(key) {
    if (!isAssigning) return;
    
    if (key === '=') {
        if (tempVariableName && tempVariableName.length > 0) {
            const value = parseFloat(document.getElementById('result').textContent);
            if (!isNaN(value)) {
                variables[tempVariableName] = value;
                addToHistory(`✅ ${tempVariableName} = ${formatResult(value)}`);
                updateVariablesDisplay();
                updateModeDisplay();
                updateResult(formatResult(value));
            }
        } else {
            updateResult('Invalid variable name');
        }
        isAssigning = false;
        tempVariableName = '';
    } else if (/[a-zA-Z]/.test(key)) {
        if (tempVariableName.length < 10) {
            tempVariableName += key;
            updateResult(`Store in: ${tempVariableName}`);
        }
    } else if (key === 'AC' || key === 'C') {
        isAssigning = false;
        tempVariableName = '';
        updateResult('0');
    }
}

function updateVariablesDisplay() {
    const variablesElement = document.getElementById('variables');
    const variableEntries = Object.entries(variables);
    
    if (variableEntries.length === 0) {
        variablesElement.innerHTML = '<div class="var-item">No variables stored</div>';
    } else {
        variablesElement.innerHTML = variableEntries
            .map(([name, value]) => 
                `<div class="var-item ${name === selectedVariable ? 'selected' : ''}" 
                      onclick="selectVariable('${name}')">
                    <span class="var-name">${name}</span>
                    <span class="var-value">${formatResult(value)}</span>
                </div>`
            )
            .join('');
    }
}

function selectVariable(varName) {
    selectedVariable = varName;
    updateVariablesDisplay();
}

function clearVariables() {
    // Keep only pi and e
    const preserved = {
        'pi': variables.pi,
        'e': variables.e
    };
    variables = preserved;
    selectedVariable = null;
    updateVariablesDisplay();
    updateModeDisplay();
    addToHistory('Cleared user variables');
}

function clearAllVariables() {
    if (confirm('Are you sure you want to clear ALL variables including pi and e?')) {
        variables = {};
        selectedVariable = null;
        updateVariablesDisplay();
        updateModeDisplay();
        addToHistory('Cleared ALL variables');
        
        // Restore pi and e
        setTimeout(() => {
            variables['pi'] = 3.141592653589793;
            variables['e'] = 2.718281828459045;
            updateVariablesDisplay();
            updateModeDisplay();
            addToHistory('Restored built-in constants pi and e');
        }, 100);
    }
}

// Memory Functions
function storeMemory() {
    const currentValue = parseFloat(document.getElementById('result').textContent);
    if (!isNaN(currentValue)) {
        memory = currentValue;
        updateModeDisplay();
        addToHistory(`💾 Stored ${formatResult(memory)} in memory`);
    } else {
        addToHistory('❌ No valid value to store in memory');
    }
}

function recallMemory() {
    if (memory !== 0) {
        currentExpression = formatResult(memory);
        updateDisplay();
        addToHistory(`📥 Recalled ${formatResult(memory)} from memory`);
    } else {
        addToHistory('❌ Memory is empty');
    }
}

function clearMemory() {
    memory = 0;
    updateModeDisplay();
    addToHistory('🗑️ Memory cleared');
}

// Section Toggles
function toggleCustomInput() {
    const section = document.getElementById('customSection');
    section.classList.toggle('active');
}

function toggleHistory() {
    const section = document.getElementById('historySection');
    section.classList.toggle('active');
}

function toggleVariables() {
    const section = document.getElementById('variablesSection');
    section.classList.toggle('active');
}

// Help System
function showHelp() {
    document.getElementById('helpModal').style.display = 'block';
}

function closeHelp() {
    document.getElementById('helpModal').style.display = 'none';
}

// Keyboard Support
document.addEventListener('keydown', function(event) {
    const key = event.key;
    
    if (isAssigning) {
        handleVariableAssignment(key);
        return;
    }
    
    if (key >= '0' && key <= '9') appendToDisplay(key);
    else if (['+', '-', '*', '/', '^', '!', '(', ')', ',', '.', '%'].includes(key)) {
        appendToDisplay(key === '*' ? '×' : key);
    }
    else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        calculate();
    }
    else if (key === 'Escape') clearAll();
    else if (key === 'Backspace') {
        event.preventDefault();
        backspace();
    }
    else if (key === 'x' || key === 'y' || key === 'z') {
        appendToDisplay(key);
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('helpModal');
    if (event.target === modal) closeHelp();
}

// Initialize calculator
window.onload = initializeCalculator;