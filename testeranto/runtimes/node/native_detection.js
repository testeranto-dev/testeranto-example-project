/**
 * Native Test Detection and Translation for Node.js/JavaScript
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');

class NodeNativeTestDetection {
    /**
     * Detect if a JavaScript/TypeScript file contains native tests and identify the framework.
     * @param {string} filePath - Path to the test file
     * @returns {Object} Detection result
     */
    static detectNativeTest(filePath) {
        if (!fs.existsSync(filePath)) {
            return {
                isNativeTest: false,
                frameworkType: null,
                testStructure: {}
            };
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const ext = path.extname(filePath);
            const isTypeScript = ext === '.ts' || ext === '.tsx';
            
            // Check file naming patterns
            const filename = path.basename(filePath);
            const isNamedTest = filename.includes('.test.') || filename.includes('.spec.');
            
            // Check for framework imports
            const hasJestImport = content.includes('jest') || content.includes('@jest/');
            const hasMochaImport = content.includes('mocha') || content.includes('@types/mocha');
            const hasJasmineImport = content.includes('jasmine') || content.includes('@types/jasmine');
            const hasVitestImport = content.includes('vitest') || content.includes('@vitest/');
            
            // Parse AST for test patterns
            const ast = this.parseAST(content, isTypeScript);
            const astPatterns = this.analyzeAST(ast);
            
            // Determine if it's a native test
            const isNativeTest = isNamedTest || 
                hasJestImport || 
                hasMochaImport || 
                hasJasmineImport || 
                hasVitestImport ||
                astPatterns.hasTestFunctions ||
                astPatterns.hasTestClasses;
            
            if (!isNativeTest) {
                return {
                    isNativeTest: false,
                    frameworkType: null,
                    testStructure: {}
                };
            }
            
            // Identify framework
            const frameworkType = this.identifyFramework(
                content, 
                hasJestImport, 
                hasMochaImport, 
                hasJasmineImport, 
                hasVitestImport,
                astPatterns
            );
            
            // Extract test structure
            const testStructure = this.extractTestStructure(ast, frameworkType);
            
            return {
                isNativeTest: true,
                frameworkType,
                testStructure
            };
            
        } catch (error) {
            console.error(`Error detecting native test in ${filePath}:`, error);
            return {
                isNativeTest: false,
                frameworkType: null,
                testStructure: {}
            };
        }
    }
    
    /**
     * Parse JavaScript/TypeScript code to AST
     */
    static parseAST(content, isTypeScript) {
        try {
            return parse(content, {
                sourceType: 'module',
                plugins: isTypeScript ? ['typescript', 'decorators-legacy'] : ['jsx', 'decorators-legacy']
            });
        } catch (error) {
            // Fallback to simple parsing
            try {
                return parse(content, {
                    sourceType: 'module',
                    plugins: ['jsx', 'decorators-legacy']
                });
            } catch (fallbackError) {
                throw new Error(`Failed to parse AST: ${fallbackError.message}`);
            }
        }
    }
    
    /**
     * Analyze AST for test patterns
     */
    static analyzeAST(ast) {
        const result = {
            hasTestFunctions: false,
            hasTestClasses: false,
            testFunctionNames: [],
            testClassNames: []
        };
        
        try {
            traverse(ast, {
                FunctionDeclaration(path) {
                    const node = path.node;
                    if (node.id && node.id.name && node.id.name.startsWith('test')) {
                        result.hasTestFunctions = true;
                        result.testFunctionNames.push(node.id.name);
                    }
                },
                FunctionExpression(path) {
                    const parent = path.parent;
                    if (parent.key && parent.key.name && parent.key.name.startsWith('test')) {
                        result.hasTestFunctions = true;
                        result.testFunctionNames.push(parent.key.name);
                    }
                },
                ArrowFunctionExpression(path) {
                    const parent = path.parent;
                    if (parent.key && parent.key.name && parent.key.name.startsWith('test')) {
                        result.hasTestFunctions = true;
                        result.testFunctionNames.push(parent.key.name);
                    }
                },
                CallExpression(path) {
                    const node = path.node;
                    // Check for describe/it/test calls
                    if (node.callee && node.callee.name) {
                        const calleeName = node.callee.name;
                        if (['describe', 'it', 'test', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'].includes(calleeName)) {
                            result.hasTestFunctions = true;
                        }
                    }
                },
                ClassDeclaration(path) {
                    const node = path.node;
                    if (node.id && node.id.name && (node.id.name.endsWith('Test') || node.id.name.endsWith('Spec'))) {
                        result.hasTestClasses = true;
                        result.testClassNames.push(node.id.name);
                    }
                }
            });
        } catch (error) {
            // Ignore AST traversal errors
        }
        
        return result;
    }
    
    /**
     * Identify the specific test framework
     */
    static identifyFramework(content, hasJestImport, hasMochaImport, hasJasmineImport, hasVitestImport, astPatterns) {
        if (hasJestImport || content.includes('jest.mock') || content.includes('jest.fn')) {
            return 'jest';
        } else if (hasVitestImport) {
            return 'vitest';
        } else if (hasMochaImport) {
            return 'mocha';
        } else if (hasJasmineImport) {
            return 'jasmine';
        } else if (astPatterns.hasTestFunctions || astPatterns.hasTestClasses) {
            // Default to jest if we have test patterns but no clear imports
            return 'jest';
        } else {
            return 'unknown';
        }
    }
    
    /**
     * Extract test structure based on framework type
     */
    static extractTestStructure(ast, frameworkType) {
        const structure = {
            testSuites: [],
            testCases: [],
            hooks: []
        };
        
        try {
            traverse(ast, {
                CallExpression(path) {
                    const node = path.node;
                    
                    // Check for describe blocks (test suites)
                    if (node.callee && node.callee.name === 'describe') {
                        const suiteName = node.arguments[0] && node.arguments[0].value;
                        if (suiteName) {
                            structure.testSuites.push({
                                name: suiteName,
                                line: node.loc ? node.loc.start.line : null
                            });
                        }
                    }
                    
                    // Check for it/test blocks (test cases)
                    if (node.callee && (node.callee.name === 'it' || node.callee.name === 'test')) {
                        const testName = node.arguments[0] && node.arguments[0].value;
                        if (testName) {
                            structure.testCases.push({
                                name: testName,
                                line: node.loc ? node.loc.start.line : null
                            });
                        }
                    }
                    
                    // Check for hooks
                    if (node.callee && ['beforeEach', 'afterEach', 'beforeAll', 'afterAll'].includes(node.callee.name)) {
                        structure.hooks.push({
                            type: node.callee.name,
                            line: node.loc ? node.loc.start.line : null
                        });
                    }
                },
                
                ClassDeclaration(path) {
                    const node = path.node;
                    if (node.id && node.id.name && (node.id.name.endsWith('Test') || node.id.name.endsWith('Spec'))) {
                        const className = node.id.name;
                        const methods = [];
                        
                        node.body.body.forEach(classMember => {
                            if (classMember.type === 'ClassMethod' || classMember.type === 'MethodDefinition') {
                                const methodName = classMember.key.name;
                                if (methodName && methodName.startsWith('test')) {
                                    methods.push({
                                        name: methodName,
                                        line: classMember.loc ? classMember.loc.start.line : null
                                    });
                                }
                            }
                        });
                        
                        if (methods.length > 0) {
                            structure.testSuites.push({
                                name: className,
                                line: node.loc ? node.loc.start.line : null,
                                methods: methods
                            });
                        }
                    }
                }
            });
        } catch (error) {
            // Ignore extraction errors
        }
        
        return structure;
    }
    
    /**
     * Generate testeranto's three canonical components from native test detection
     */
    static translateToTesteranto(detectionResult) {
        if (!detectionResult.isNativeTest) {
            return {
                specification: '',
                implementation: '',
                adapter: ''
            };
        }
        
        const framework = detectionResult.frameworkType;
        const structure = detectionResult.testStructure;
        
        if (framework === 'jest') {
            return this.generateJestComponents(structure);
        } else if (framework === 'mocha') {
            return this.generateMochaComponents(structure);
        } else if (framework === 'vitest') {
            return this.generateVitestComponents(structure);
        } else {
            return this.generateGenericComponents(structure);
        }
    }
    
    /**
     * Generate testeranto components for Jest tests
     */
    static generateJestComponents(structure) {
        // Generate specification
        const specLines = [
            '// Generated specification for Jest tests',
            'const specification = (Suite, Given, When, Then) => ['
        ];
        
        // Add suites for describe blocks
        structure.testSuites.forEach(suite => {
            specLines.push(`  Suite("${suite.name}", {`);
            specLines.push(`    "${suite.name} setup": Given(`);
            specLines.push(`      ["${suite.name}"],`);
            specLines.push(`      [`);
            
            // Add Whens for test cases in this suite
            structure.testCases.forEach(testCase => {
                specLines.push(`        When("${testCase.name}", /* ... */),`);
            });
            
            specLines.push(`      ],`);
            specLines.push(`      [`);
            specLines.push(`        Then("assertions pass", /* ... */),`);
            specLines.push(`      ]`);
            specLines.push(`    ),`);
            specLines.push(`  }),`);
        });
        
        specLines.push('];');
        
        const specification = specLines.join('\n');
        
        // Generate implementation
        const implementation = `// Generated implementation for Jest tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};`;
        
        // Generate adapter
        const adapter = `// Generated adapter for Jest tests
const adapter = {
  beforeAll: (input, testResource) => {
    // Jest global setup
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    // Jest beforeEach hook
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    // Execute Jest test
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    // Execute Jest assertions
    return thenCB(store);
  }
};`;
        
        return {
            specification,
            implementation,
            adapter
        };
    }
    
    /**
     * Generate testeranto components for Mocha tests
     */
    static generateMochaComponents(structure) {
        const specification = `// Generated specification for Mocha tests
const specification = (Suite, Given, When, Then) => [
  // Mocha test suites would be generated here
];`;
        
        const implementation = `// Generated implementation for Mocha tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};`;
        
        const adapter = `// Generated adapter for Mocha tests
const adapter = {
  beforeAll: (input, testResource) => {
    // Mocha before() hook
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    // Mocha beforeEach() hook
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    // Execute Mocha test
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    // Execute Mocha assertions
    return thenCB(store);
  }
};`;
        
        return {
            specification,
            implementation,
            adapter
        };
    }
    
    /**
     * Generate testeranto components for Vitest tests
     */
    static generateVitestComponents(structure) {
        const specification = `// Generated specification for Vitest tests
const specification = (Suite, Given, When, Then) => [
  // Vitest test suites would be generated here
];`;
        
        const implementation = `// Generated implementation for Vitest tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};`;
        
        const adapter = `// Generated adapter for Vitest tests
const adapter = {
  beforeAll: (input, testResource) => {
    // Vitest setup
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    // Vitest beforeEach hook
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    // Execute Vitest test
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    // Execute Vitest assertions
    return thenCB(store);
  }
};`;
        
        return {
            specification,
            implementation,
            adapter
        };
    }
    
    /**
     * Generate testeranto components for generic tests
     */
    static generateGenericComponents(structure) {
        const specification = `// Generated specification for generic JavaScript tests
const specification = (Suite, Given, When, Then) => [
  // Generic test structure
];`;
        
        const implementation = `// Generated implementation for generic JavaScript tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};`;
        
        const adapter = `// Generated adapter for generic JavaScript tests
const adapter = {
  beforeAll: (input, testResource) => {
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    return thenCB(store);
  }
};`;
        
        return {
            specification,
            implementation,
            adapter
        };
    }
}

module.exports = NodeNativeTestDetection;
