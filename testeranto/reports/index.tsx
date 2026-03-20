import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import {
  type TreeNode,
  findNodeInTree,
  getNodeIcon,
  renderTestDetails,
} from "testeranto/src/server/serverClasses/StakeholderUtils";

export interface StakeholderData {
  documentation: {
    files: string[];
    timestamp?: number;
  };
  testResults: Record<string, any>;
  errors: Array<{
    configKey: string;
    testName: string;
    message: string;
    lastAttempt?: any;
    triedPaths?: string[];
  }>;
  configs: {
    runtimes: Record<
      string,
      {
        runtime: string;
        tests: string[];
        dockerfile: string;
      }
    >;
    documentationGlob?: string;
  };
  timestamp: string;
  workspaceRoot: string;
  featureTree?: any;
  // Add test results data
  allTestResults?: {
    [configKey: string]: {
      [testName: string]: any; // The content of tests.json
    };
  };
}

export interface StakeholderAppProps {
  data: StakeholderData;
}

export const DefaultStakeholderApp: React.FC<StakeholderAppProps> = ({
  data,
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set([".", "root"]),
  );
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<any>(null);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleFileSelect = (node: any) => {
    setSelectedFile(node.path);

    // Handle test results with internal structure
    if (node.fileType === "test-results") {
      if (node.testData) {
        // If node has testData, use it
        setSelectedFileContent(node.testData);
      } else if (node.children) {
        // If node has children (internal structure), show a summary
        setSelectedFileContent({
          type: "test-results-tree",
          path: node.path,
          name: node.name,
          children: node.children,
        });
      } else {
        setSelectedFileContent(null);
      }
    } else if (node.fileType === "log") {
      // For log files, try to fetch the content
      // Since we can't fetch from filesystem in browser, we'll show a message
      // In a real implementation, this would fetch the file content via an API
      setSelectedFileContent({
        type: "log",
        path: node.path,
        name: node.name,
        message: `Log file: ${node.path}. In a real implementation, the content would be fetched from the server.`
      });
    } else if (node.fileType === "test-source") {
      // For test source files, don't show content, just show info
      setSelectedFileContent({
        type: "test-source",
        path: node.path,
        name: node.name,
        message:
          "This is a test source file. Test results are attached below if available.",
      });
    } else if (
      node.content !== null &&
      node.content !== undefined &&
      node.fileType === "documentation"
    ) {
      // Only show content for documentation files
      setSelectedFileContent(node.content);
    } else if (node.children) {
      // For nodes with children but no content, show their structure
      setSelectedFileContent({
        type: "tree-node",
        path: node.path,
        name: node.name,
        children: node.children,
      });
    } else {
      setSelectedFileContent(null);
    }
  };

  const renderTree = (node: TreeNode, depth: number = 0) => {
    if (!node) return null;

    const paddingLeft = depth * 20;
    const isExpanded = expandedPaths.has(node.path);

    if (node.type === "directory") {
      return (
        <div
          key={node.path}
          style={{ marginLeft: paddingLeft, marginBottom: "5px" }}
        >
          <div
            style={{
              fontWeight: "bold",
              color: "#007acc",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
            onClick={() => toggleExpand(node.path)}
          >
            <span style={{ marginRight: "5px" }}>
              {isExpanded ? "📂" : "📁"}
            </span>
            {node.name}
            <span
              style={{ fontSize: "0.8rem", marginLeft: "5px", color: "#666" }}
            >
              ({Object.keys(node.children || {}).length} items)
            </span>
          </div>
          {isExpanded &&
            node.children &&
            Object.keys(node.children).length > 0 && (
              <div style={{ marginLeft: "10px" }}>
                {Object.values(node.children).map((child: any) =>
                  renderTree(child, depth + 1),
                )}
              </div>
            )}
        </div>
      );
    } else if (node.type === "file") {
      const { icon, color } = getNodeIcon(node);
      // Add log file background color
      const bgColor =
        selectedFile === node.path
          ? node.fileType === "documentation"
            ? "#e8f5e9"
            : node.fileType === "test-results"
              ? "#fff3e0"
              : node.fileType === "log"
                ? "#fff8e1"
                : node.fileType === "test-directory" ||
                  node.fileType === "test-source"
                  ? "#f3e5f5"
                  : node.fileType === "test-artifact"
                    ? "#efebe9"
                    : node.fileType === "html"
                      ? "#e3f2fd"
                      : node.fileType === "javascript"
                        ? "#fff3e0"
                        : "transparent"
          : "transparent";

      const hasChildren =
        node.children && Object.keys(node.children).length > 0;
      const isExpanded = expandedPaths.has(node.path);

      return (
        <div
          key={node.path}
          style={{
            marginLeft: paddingLeft,
            marginBottom: "3px",
            backgroundColor: bgColor,
            borderRadius: "4px",
            padding: "5px",
            cursor: "pointer",
          }}
        >
          <div
            style={{ color, display: "flex", alignItems: "center" }}
            onClick={() => handleFileSelect(node)}
          >
            <span style={{ marginRight: "5px" }}>{icon}</span>
            {node.name}
            {node.fileType && (
              <span
                style={{ fontSize: "0.8rem", marginLeft: "5px", color: "#666" }}
              >
                ({node.fileType})
              </span>
            )}
            {hasChildren && (
              <span
                style={{
                  marginLeft: "5px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.path);
                }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
            )}
          </div>
          {node.testData && (
            <div
              style={{ marginLeft: "10px", fontSize: "0.9rem", color: "#666" }}
            >
              <div>
                Status: {node.testData.failed ? "❌ Failed" : "✅ Passed"} |
                Tests: {node.testData.runTimeTests || 0} | Fails:{" "}
                {node.testData.fails || 0}
              </div>
            </div>
          )}
          {hasChildren && isExpanded && (
            <div style={{ marginLeft: "10px", marginTop: "5px" }}>
              {Object.values(node.children).map((child: any) =>
                renderTree(child, depth + 1),
              )}
            </div>
          )}
        </div>
      );
    } else if (
      node.type === "feature" ||
      node.type === "test-summary" ||
      node.type === "test-job" ||
      node.type === "test-given" ||
      node.type === "test-when" ||
      node.type === "test-then"
    ) {
      const { icon, color } = getNodeIcon(node);
      const hasChildren =
        node.children && Object.keys(node.children).length > 0;
      const isExpanded = expandedPaths.has(node.path);

      return (
        <div
          key={node.path}
          style={{ marginLeft: paddingLeft, marginBottom: "3px" }}
        >
          <div style={{ color, display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: "5px" }}>{icon}</span>
            {node.name}
            {hasChildren && (
              <span
                style={{
                  marginLeft: "5px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.path);
                }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div style={{ marginLeft: "10px", marginTop: "5px" }}>
              {Object.values(node.children).map((child: any) =>
                renderTree(child, depth + 1),
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const renderTestDetails = (testData: any) => {
    if (!testData || typeof testData !== "object") {
      return (
        <div style={{ marginTop: "20px" }}>
          <h3>Test Results</h3>
          <p>No test data available or invalid format.</p>
        </div>
      );
    }

    return (
      <div style={{ marginTop: "20px" }}>
        <h3>Test Results Details</h3>
        <div
          style={{
            padding: "15px",
            backgroundColor: testData.failed ? "#ffebee" : "#e8f5e9",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #ddd",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <strong>Overall Status:</strong>{" "}
              {testData.failed ? "❌ Failed" : "✅ Passed"}
            </div>
            <div>
              <strong>Total Tests:</strong> {testData.runTimeTests || 0}
            </div>
            <div>
              <strong>Failures:</strong> {testData.fails || 0}
            </div>
            {testData.features && (
              <div>
                <strong>Features:</strong> {testData.features.length}
              </div>
            )}
          </div>
        </div>

        {testData.testJob && testData.testJob.givens && (
          <div>
            <h4>Test Cases ({testData.testJob.givens.length})</h4>
            {testData.testJob.givens.map((given: any, index: number) => (
              <div
                key={index}
                style={{
                  marginBottom: "20px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "15px",
                  backgroundColor: given.failed ? "#ffebee" : "#e8f5e9",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                    {given.key || `Test Case ${index + 1}`}
                  </div>
                  <div
                    style={{
                      padding: "5px 10px",
                      borderRadius: "4px",
                      backgroundColor: given.failed ? "#f44336" : "#4caf50",
                      color: "white",
                      fontWeight: "bold",
                    }}
                  >
                    {given.failed ? "❌ Failed" : "✅ Passed"}
                  </div>
                </div>

                {given.features && given.features.length > 0 && (
                  <div style={{ marginBottom: "10px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                      Features:
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "5px",
                        marginBottom: "10px",
                      }}
                    >
                      {given.features.map((feature: string, i: number) => (
                        <span
                          key={i}
                          style={{
                            backgroundColor: "#e3f2fd",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.85rem",
                          }}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {given.whens && given.whens.length > 0 && (
                  <div style={{ marginBottom: "10px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                      Steps:
                    </div>
                    <div
                      style={{
                        padding: "10px",
                        backgroundColor: "white",
                        borderRadius: "4px",
                        border: "1px solid #eee",
                      }}
                    >
                      {given.whens.map((w: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom:
                              i < given.whens.length - 1 ? "5px" : "0",
                          }}
                        >
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              backgroundColor: w.status ? "#4caf50" : "#f44336",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: "10px",
                              fontSize: "0.8rem",
                            }}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <div style={{ fontWeight: "bold" }}>{w.name}</div>
                            {w.error && (
                              <div
                                style={{ fontSize: "0.8rem", color: "#f44336" }}
                              >
                                Error:{" "}
                                {typeof w.error === "string"
                                  ? w.error
                                  : JSON.stringify(w.error)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {given.thens && given.thens.length > 0 && (
                  <div style={{ marginBottom: "10px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                      Assertions:
                    </div>
                    <div
                      style={{
                        padding: "10px",
                        backgroundColor: "white",
                        borderRadius: "4px",
                        border: "1px solid #eee",
                      }}
                    >
                      {given.thens.map((then: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom:
                              i < given.thens.length - 1 ? "5px" : "0",
                          }}
                        >
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              backgroundColor: then.status
                                ? "#4caf50"
                                : "#f44336",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: "10px",
                              fontSize: "0.7rem",
                            }}
                          >
                            {then.status ? "✓" : "✗"}
                          </div>
                          <div>
                            <div style={{ fontWeight: "bold" }}>
                              {then.name}
                            </div>
                            {then.error && (
                              <div
                                style={{ fontSize: "0.8rem", color: "#f44336" }}
                              >
                                Error:{" "}
                                {typeof then.error === "string"
                                  ? then.error
                                  : JSON.stringify(then.error)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {given.error && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px",
                      backgroundColor: "#ffcdd2",
                      borderRadius: "4px",
                      border: "1px solid #f44336",
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                      Error Details:
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word",
                      }}
                    >
                      {Array.isArray(given.error)
                        ? given.error
                          .map((err: any, i: number) =>
                            typeof err === "string"
                              ? err
                              : JSON.stringify(err, null, 2),
                          )
                          .join("\n")
                        : JSON.stringify(given.error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {testData.features && testData.features.length > 0 && (
          <div style={{ marginTop: "30px" }}>
            <h4>All Features ({testData.features.length})</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "10px",
                marginTop: "10px",
              }}
            >
              {testData.features.map((feature: string, index: number) => (
                <div
                  key={index}
                  style={{
                    padding: "10px",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFileContent = () => {
    if (!selectedFile) return null;

    // Check if it's a test results file
    if (selectedFileContent && typeof selectedFileContent === "object") {
      // Check if it has testJob structure (tests.json)
      if (selectedFileContent.testJob) {
        return renderTestDetails(selectedFileContent);
      } else if (selectedFileContent.type === "log") {
        // Handle log files
        return (
          <div style={{ marginTop: "20px" }}>
            <h3>Log File: {selectedFile.split("/").pop()}</h3>
            <div
              style={{
                backgroundColor: "#f5f5f5",
                padding: "20px",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            >
              <p>{selectedFileContent.message}</p>
              <p>Path: {selectedFileContent.path}</p>
              <p>Note: In a real implementation, the actual log content would be displayed here.</p>
            </div>
          </div>
        );
      } else if (selectedFileContent.type === "test-source") {
        return (
          <div style={{ marginTop: "20px" }}>
            <h3>Test Source: {selectedFile.split("/").pop()}</h3>
            <div
              style={{
                backgroundColor: "#e3f2fd",
                padding: "20px",
                borderRadius: "4px",
                border: "1px solid #2196f3",
              }}
            >
              <p>{selectedFileContent.message}</p>
              <p>Path: {selectedFileContent.path}</p>
            </div>
          </div>
        );
      } else {
        // For other objects, render as JSON
        return (
          <div style={{ marginTop: "20px" }}>
            <h3>File Content</h3>
            <pre
              style={{
                backgroundColor: "#f5f5f5",
                padding: "10px",
                borderRadius: "4px",
                overflow: "auto",
                maxHeight: "400px",
              }}
            >
              {JSON.stringify(selectedFileContent, null, 2)}
            </pre>
          </div>
        );
      }
    } else if (selectedFileContent) {
      // Check if it's a documentation file (markdown)
      const isMarkdown =
        selectedFile &&
        (selectedFile.endsWith(".md") || selectedFile.endsWith(".markdown"));

      if (isMarkdown && typeof selectedFileContent === "string") {
        // For markdown, we could render it, but for now just show as plain text
        return (
          <div style={{ marginTop: "20px" }}>
            <h3>Documentation: {selectedFile.split("/").pop()}</h3>
            <div
              style={{
                backgroundColor: "#f9f9f9",
                padding: "20px",
                borderRadius: "4px",
                overflow: "auto",
                maxHeight: "500px",
                border: "1px solid #ddd",
              }}
            >
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  fontFamily: "monospace",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  margin: 0,
                }}
              >
                {selectedFileContent}
              </pre>
            </div>
          </div>
        );
      } else if (typeof selectedFileContent === "string") {
        return (
          <div style={{ marginTop: "20px" }}>
            <h3>File Content</h3>
            <pre
              style={{
                backgroundColor: "#f5f5f5",
                padding: "10px",
                borderRadius: "4px",
                overflow: "auto",
                maxHeight: "400px",
              }}
            >
              {selectedFileContent}
            </pre>
          </div>
        );
      }
    } else {
      return (
        <div style={{ marginTop: "20px" }}>
          <h3>No content available for {selectedFile}</h3>
          <p>
            The file exists in the tree but its content could not be loaded.
          </p>
        </div>
      );
    }

    // Fallback
    return null;
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
        display: "flex",
        gap: "20px",
      }}
    >
      <div
        style={{
          flex: "0 0 300px",
          borderRight: "1px solid #ddd",
          paddingRight: "20px",
        }}
      >
        <div
          style={{
            border: "1px solid #ddd",
            padding: "15px",
            background: "#f9f9f9",
            maxHeight: "600px",
            overflow: "auto",
          }}
        >
          {data.featureTree ? (
            renderTree(data.featureTree)
          ) : (
            <div>
              <p>
                No feature tree available. The tree should show documentation
                files in their proper folder structure.
              </p>
              <p>
                Documentation files found:{" "}
                {data.documentation?.files?.length || 0}
              </p>
              <div
                style={{
                  border: "1px solid #eee",
                  padding: "10px",
                  background: "#fff",
                  maxHeight: "200px",
                  overflow: "auto",
                }}
              >
                {data.documentation?.files?.map((file, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "0.8rem",
                      marginBottom: "2px",
                      padding: "2px",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    {file}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: "1" }}>
        {selectedFile && (
          <div
            style={{
              marginBottom: "20px",
              padding: "10px",
              backgroundColor: "#e3f2fd",
              borderRadius: "4px",
            }}
          >
            <strong>Selected:</strong> {selectedFile}
          </div>
        )}

        {renderFileContent()}

        {!selectedFile && (
          <div>
            <h3>Configuration</h3>
            {data.configs?.runtimes ? (
              <div>
                <p>
                  Found {Object.keys(data.configs.runtimes).length} runtimes:
                </p>
                {Object.entries(data.configs.runtimes).map(
                  ([key, runtime]: [string, any]) => (
                    <div
                      key={key}
                      style={{
                        marginBottom: "10px",
                        padding: "5px",
                        borderLeft: "3px solid #007acc",
                      }}
                    >
                      <strong>{key}</strong> ({runtime.runtime})
                      <div style={{ marginLeft: "10px" }}>
                        Tests: {runtime.tests?.length || 0}
                        {runtime.tests?.map((test: string, i: number) => {
                          // Check if we have test results for this test
                          const testResult = data.allTestResults?.[key]?.[test];
                          return (
                            <div key={i} style={{ 
                              fontSize: "12px",
                              marginBottom: "5px",
                              padding: "3px",
                              backgroundColor: testResult ? 
                                (testResult.failed ? "#ffebee" : "#e8f5e9") : 
                                "#f5f5f5",
                              borderRadius: "3px"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>{test}</span>
                                {testResult && (
                                  <span style={{
                                    fontWeight: "bold",
                                    color: testResult.failed ? "#f44336" : "#4caf50"
                                  }}>
                                    {testResult.failed ? "❌ Failed" : "✅ Passed"}
                                  </span>
                                )}
                              </div>
                              {testResult && (
                                <div style={{ fontSize: "11px", marginTop: "2px" }}>
                                  Tests: {testResult.runTimeTests || 0} | 
                                  Fails: {testResult.fails || 0} |
                                  Features: {testResult.features?.length || 0}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p>No configuration found</p>
            )}
            
            {/* Add a section for test results summary */}
            {data.allTestResults && Object.keys(data.allTestResults).length > 0 && (
              <div style={{ marginTop: "30px" }}>
                <h3>Test Results Summary</h3>
                {Object.entries(data.allTestResults).map(([configKey, tests]) => (
                  <div key={configKey} style={{ marginBottom: "20px" }}>
                    <h4>{configKey}</h4>
                    {Object.entries(tests).map(([testName, testData]) => (
                      <div 
                        key={testName}
                        style={{
                          padding: "10px",
                          marginBottom: "10px",
                          backgroundColor: testData.failed ? "#ffebee" : "#e8f5e9",
                          borderRadius: "5px",
                          border: "1px solid #ddd",
                          cursor: "pointer"
                        }}
                        onClick={() => {
                          setSelectedFile(`${configKey}/${testName}`);
                          setSelectedFileContent(testData);
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <strong>{testName}</strong>
                          <span style={{
                            fontWeight: "bold",
                            color: testData.failed ? "#f44336" : "#4caf50"
                          }}>
                            {testData.failed ? "❌ Failed" : "✅ Passed"}
                          </span>
                        </div>
                        <div style={{ fontSize: "14px", marginTop: "5px" }}>
                          <div>Total Tests: {testData.runTimeTests || 0}</div>
                          <div>Failures: {testData.fails || 0}</div>
                          {testData.features && (
                            <div>Features: {testData.features.length}</div>
                          )}
                        </div>
                        {testData.features && testData.features.length > 0 && (
                          <div style={{ marginTop: "10px" }}>
                            <div style={{ fontSize: "12px", fontWeight: "bold" }}>Features:</div>
                            <div style={{ 
                              display: "flex", 
                              flexWrap: "wrap", 
                              gap: "5px",
                              marginTop: "5px"
                            }}>
                              {testData.features.slice(0, 3).map((feature: string, i: number) => (
                                <span 
                                  key={i}
                                  style={{
                                    backgroundColor: "#e3f2fd",
                                    padding: "2px 6px",
                                    borderRadius: "10px",
                                    fontSize: "11px"
                                  }}
                                >
                                  {feature}
                                </span>
                              ))}
                              {testData.features.length > 3 && (
                                <span style={{
                                  backgroundColor: "#f5f5f5",
                                  padding: "2px 6px",
                                  borderRadius: "10px",
                                  fontSize: "11px"
                                }}>
                                  +{testData.features.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Function to render the app
export function renderApp(rootElement: HTMLElement, data?: StakeholderData) {
  // If no data is provided, try to get it from window
  const appData = data || (typeof window !== 'undefined' && (window as any).TESTERANTO_EMBEDDED_DATA);
  
  if (!appData) {
    console.error('No stakeholder data available');
    return;
  }
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <DefaultStakeholderApp data={appData} />
    </React.StrictMode>,
  );
}

// Export for use in HTML
export default DefaultStakeholderApp;
