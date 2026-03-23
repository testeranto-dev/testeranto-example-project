// NOTE: this file is not a part of our build process, but a odwnstream process run by the user
// this file is copied to the users project where they can cutomize it
// This is where a used configure the vizualization. 
//  for instange, the columns in a kanban chart and to which attribute they map

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  type TreeNode,
  findNodeInTree,
  getNodeIcon,
  renderTestDetails,
} from "testeranto/src/server/serverClasses/StakeholderUtils";

// Note: grafeovidajo should be provided as an external dependency
// The user's project needs to have it installed
import { GraphData, Node, EisenhowerMatrix, GanttChart, KanbanBoard, TreeGraph } from "grafeovidajo";

export interface StakeholderData {
  documentation: {
    files: string[];
    timestamp?: number;
    contents?: Record<string, string>;
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
  // Add feature graph for visualization
  featureGraph?: GraphData;
  // Add viz configuration
  vizConfig?: any;
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
  const [activeTab, setActiveTab] = useState<'tree' | 'viz'>('tree');
  const [vizType, setVizType] = useState<'eisenhower' | 'gantt' | 'kanban' | 'tree'>('eisenhower');

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

    // Handle file nodes (source files, documentation, etc.)
    if (node.type === "file") {
      // Check if we have embedded content
      const embeddedData = (window as any).TESTERANTO_EMBEDDED_DATA;
      if (embeddedData && embeddedData.fileContents && embeddedData.fileContents[node.path]) {
        const content = embeddedData.fileContents[node.path];
        // Determine language from file extension
        const ext = node.path.split('.').pop()?.toLowerCase();
        let language = 'text';
        if (ext === 'js' || ext === 'jsx') language = 'javascript';
        else if (ext === 'ts' || ext === 'tsx') language = 'typescript';
        else if (ext === 'py') language = 'python';
        else if (ext === 'rb') language = 'ruby';
        else if (ext === 'go') language = 'go';
        else if (ext === 'rs') language = 'rust';
        else if (ext === 'java') language = 'java';
        else if (ext === 'html') language = 'html';
        else if (ext === 'css') language = 'css';
        else if (ext === 'json') language = 'json';
        else if (ext === 'md') language = 'markdown';
        else if (ext === 'yml' || ext === 'yaml') language = 'yaml';
        else if (ext === 'xml') language = 'xml';
        else if (ext === 'sh') language = 'bash';
        else if (ext === 'log') language = 'log';

        setSelectedFileContent({
          type: "file",
          path: node.path,
          name: node.name,
          content: content,
          language: language,
          size: content.length,
          fileType: node.fileType
        });
      } else if (embeddedData && embeddedData.documentation && embeddedData.documentation.contents &&
        embeddedData.documentation.contents[node.path]) {
        // Check documentation contents
        const content = embeddedData.documentation.contents[node.path];
        setSelectedFileContent({
          type: "documentation",
          path: node.path,
          name: node.name,
          content: content,
          language: 'markdown',
          size: content.length
        });
      } else {
        setSelectedFileContent({
          type: "file",
          path: node.path,
          name: node.name,
          message: `File content not embedded: ${node.path}`,
          fileType: node.fileType
        });
      }
    }
    // Handle documentation files
    else if (node.fileType === "documentation") {
      const embeddedData = (window as any).TESTERANTO_EMBEDDED_DATA;
      if (embeddedData && embeddedData.documentation && embeddedData.documentation.contents &&
        embeddedData.documentation.contents[node.path]) {
        const content = embeddedData.documentation.contents[node.path];
        setSelectedFileContent({
          type: "documentation",
          path: node.path,
          name: node.name,
          content: content,
          language: 'markdown',
          size: content.length
        });
      } else {
        setSelectedFileContent({
          type: "documentation",
          path: node.path,
          name: node.name,
          message: `Documentation file: ${node.path}. Content not embedded.`
        });
      }
    }
    // Handle test nodes with BDD status
    else if (node.type === "test") {
      setSelectedFileContent({
        type: "test",
        path: node.path,
        name: node.name,
        bddStatus: node.bddStatus || { status: 'unknown', color: 'gray' },
        children: node.children
      });
    }
    // Handle feature nodes
    else if (node.type === "feature") {
      setSelectedFileContent({
        type: "feature",
        path: node.path,
        name: node.name,
        feature: node.feature,
        status: node.status || 'unknown'
      });
    }
    // Handle directory nodes
    else if (node.type === "directory") {
      setSelectedFileContent({
        type: "directory",
        path: node.path,
        name: node.name,
        children: node.children
      });
    }
    else {
      setSelectedFileContent(null);
    }
  };

  const renderTree = (node: any, depth: number = 0) => {
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
      const bgColor =
        selectedFile === node.path
          ? node.fileType === "documentation"
            ? "#e8f5e9"
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
          {hasChildren && isExpanded && (
            <div style={{ marginLeft: "10px", marginTop: "5px" }}>
              {Object.values(node.children).map((child: any) =>
                renderTree(child, depth + 1),
              )}
            </div>
          )}
        </div>
      );
    } else if (node.type === "feature") {
      const bgColor =
        selectedFile === node.path ? "#fff3e0" : "transparent";

      return (
        <div
          key={node.path}
          style={{
            marginLeft: paddingLeft,
            marginBottom: "3px",
            backgroundColor: bgColor,
            borderRadius: "4px",
            padding: "5px",
          }}
        >
          <div style={{ color: "#ff9800", display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: "5px" }}>⭐</span>
            {node.name}
            {node.status && (
              <span
                style={{
                  fontSize: "0.8rem",
                  marginLeft: "5px",
                  color: "#666",
                }}
              >
                (status: {node.status})
              </span>
            )}
          </div>
        </div>
      );
    } else if (node.type === "test") {
      // Handle test nodes with BDD status
      const bgColor =
        selectedFile === node.path ? "#e3f2fd" : "transparent";
      const status = node.bddStatus || { status: 'unknown', color: 'gray' };

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
          onClick={() => handleFileSelect(node)}
        >
          <div style={{ color: "#9c27b0", display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: "5px" }}>🧪</span>
            {node.name}
            <span
              style={{
                fontSize: "0.8rem",
                marginLeft: "5px",
                color: status.color === 'green' ? '#4caf50' :
                  status.color === 'yellow' ? '#ff9800' :
                    status.color === 'red' ? '#f44336' : '#666',
                fontWeight: 'bold'
              }}
            >
              (BDD: {status.status})
            </span>
          </div>
          {node.children && Object.keys(node.children).length > 0 && (
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

    if (!selectedFileContent) {
      return (
        <div style={{ marginTop: "20px" }}>
          <h3>No content available for {selectedFile}</h3>
          <p>
            The file exists in the tree but its content could not be loaded.
          </p>
        </div>
      );
    }

    // Handle different content types
    switch (selectedFileContent.type) {
      case "file":
      case "documentation":
        const isDocumentation = selectedFileContent.type === "documentation";
        const title = isDocumentation ? "Documentation" : "File";
        return (
          <div style={{ marginTop: "20px" }}>
            <h3>{title}: {selectedFile.split("/").pop()}</h3>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>Path: {selectedFileContent.path}</div>
              <div>Size: {selectedFileContent.size || (selectedFileContent.content?.length || 0)} characters</div>
              {selectedFileContent.language && (
                <div>Language: {selectedFileContent.language}</div>
              )}
            </div>
            {selectedFileContent.content ? (
              <div>
                <pre
                  style={{
                    backgroundColor: "#f5f5f5",
                    padding: "15px",
                    borderRadius: "4px",
                    overflow: "auto",
                    maxHeight: "500px",
                    border: "1px solid #ddd",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    fontFamily: "monospace",
                    fontSize: "14px",
                    margin: 0
                  }}
                >
                  {selectedFileContent.content}
                </pre>
              </div>
            ) : selectedFileContent.message ? (
              <div
                style={{
                  backgroundColor: "#f9f9f9",
                  padding: "20px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              >
                <p>{selectedFileContent.message}</p>
                <p>Path: {selectedFileContent.path}</p>
                {isDocumentation && (
                  <p>Note: Documentation content was not embedded in the static site.</p>
                )}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#ffebee",
                  padding: "20px",
                  borderRadius: "4px",
                  border: "1px solid #f44336",
                }}
              >
                <p>No content available for this file.</p>
              </div>
            )}
          </div>
        );
      case "test":
        return (
          <div style={{ marginTop: "20px" }}>
            <h3>Test: {selectedFileContent.name}</h3>
            <div
              style={{
                padding: "15px",
                backgroundColor: selectedFileContent.bddStatus.color === 'green' ? '#e8f5e9' :
                  selectedFileContent.bddStatus.color === 'yellow' ? '#fff3e0' :
                    selectedFileContent.bddStatus.color === 'red' ? '#ffebee' : '#f5f5f5',
                borderRadius: "4px",
                marginBottom: "20px",
                border: "1px solid #ddd",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                <div>
                  <strong>BDD Status:</strong> {selectedFileContent.bddStatus.status}
                </div>
                <div>
                  <strong>Path:</strong> {selectedFileContent.path}
                </div>
              </div>
            </div>
            {selectedFileContent.children && (
              <div>
                <h4>Test Details</h4>
                <div style={{ marginLeft: "20px" }}>
                  {Object.values(selectedFileContent.children).map((child: any, i: number) => (
                    <div key={i} style={{ marginBottom: "10px" }}>
                      {JSON.stringify(child, null, 2)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "feature":
        return (
          <div style={{ marginTop: "20px" }}>
            <h3>Feature: {selectedFileContent.name}</h3>
            <div
              style={{
                padding: "15px",
                backgroundColor: "#fff3e0",
                borderRadius: "4px",
                border: "1px solid #ff9800",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                <div>
                  <strong>Feature:</strong> {selectedFileContent.feature}
                </div>
                <div>
                  <strong>Status:</strong> {selectedFileContent.status}
                </div>
                <div>
                  <strong>Path:</strong> {selectedFileContent.path}
                </div>
              </div>
            </div>
          </div>
        );
      case "directory":
        return (
          <div style={{ marginTop: "20px" }}>
            <h3>Directory: {selectedFileContent.name}</h3>
            <div
              style={{
                padding: "15px",
                backgroundColor: "#e3f2fd",
                borderRadius: "4px",
                border: "1px solid #2196f3",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
                <div>
                  <strong>Path:</strong> {selectedFileContent.path}
                </div>
                <div>
                  <strong>Items:</strong> {Object.keys(selectedFileContent.children || {}).length}
                </div>
              </div>
            </div>
          </div>
        );
      default:
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
  };

  // Render visualization
  const renderVisualization = () => {
    if (!data.featureGraph || !data.featureGraph.nodes || data.featureGraph.nodes.length === 0) {
      return (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h3>No Feature Graph Available</h3>
          <p>Features need to be extracted from test results to create visualizations.</p>
          <p>Run tests to generate feature data.</p>
        </div>
      );
    }

    const graphData: GraphData = {
      nodes: data.featureGraph.nodes,
      edges: data.featureGraph.edges || []
    };

    const baseConfig = data.vizConfig || {
      projection: {
        xAttribute: 'status',
        yAttribute: 'points',
        xType: 'categorical',
        yType: 'continuous',
        layout: 'grid'
      },
      style: {
        nodeSize: (node: any) => {
          if (node.attributes.points) return Math.max(10, node.attributes.points * 5);
          return 10;
        },
        nodeColor: (node: any) => {
          const status = node.attributes.status;
          if (status === 'done') return '#4caf50';
          if (status === 'doing') return '#ff9800';
          if (status === 'todo') return '#f44336';
          return '#9e9e9e';
        },
        nodeShape: 'circle',
        labels: {
          show: true,
          attribute: 'name',
          fontSize: 12
        }
      }
    };

    const commonProps = {
      data: graphData,
      width: 800,
      height: 500,
      onNodeClick: (node: Node) => {
        console.log('Node clicked:', node);
        // You could implement node selection here
      },
      onNodeHover: (node: Node | null) => {
        // Handle hover
      }
    };

    switch (vizType) {
      case 'eisenhower':
        return (
          <div>
            <h3>Eisenhower Matrix</h3>
            <p>Urgency vs Importance of features</p>
            <EisenhowerMatrix
              {...commonProps}
              config={{
                ...baseConfig,
                projection: {
                  ...baseConfig.projection,
                  xAttribute: 'urgency',
                  yAttribute: 'importance',
                  xType: 'continuous',
                  yType: 'continuous'
                },
                quadrants: {
                  urgentImportant: { x: [0, 0.5], y: [0, 0.5] },
                  notUrgentImportant: { x: [0.5, 1], y: [0, 0.5] },
                  urgentNotImportant: { x: [0, 0.5], y: [0.5, 1] },
                  notUrgentNotImportant: { x: [0.5, 1], y: [0.5, 1] }
                }
              }}
            />
          </div>
        );
      case 'gantt':
        return (
          <div>
            <h3>Gantt Chart</h3>
            <p>Feature timeline</p>
            <GanttChart
              {...commonProps}
              config={{
                ...baseConfig,
                timeRange: [new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)],
                rowHeight: 30,
                showDependencies: true
              }}
            />
          </div>
        );
      case 'kanban':
        return (
          <div>
            <h3>Kanban Board</h3>
            <p>Feature status columns</p>
            <KanbanBoard
              {...commonProps}
              config={{
                ...baseConfig,
                columns: [
                  {
                    id: 'todo',
                    title: 'To Do',
                    statusFilter: (node: Node) => node.attributes.status === 'todo',
                    width: 25
                  },
                  {
                    id: 'doing',
                    title: 'Doing',
                    statusFilter: (node: Node) => node.attributes.status === 'doing',
                    width: 25
                  },
                  {
                    id: 'review',
                    title: 'Review',
                    statusFilter: (node: Node) => node.attributes.status === 'review',
                    width: 25
                  },
                  {
                    id: 'done',
                    title: 'Done',
                    statusFilter: (node: Node) => node.attributes.status === 'done',
                    width: 25
                  }
                ]
              }}
            />
          </div>
        );
      case 'tree':
        return (
          <div>
            <h3>Feature Dependency Tree</h3>
            <p>Feature relationships</p>
            <TreeGraph
              {...commonProps}
              config={{
                ...baseConfig,
                projection: {
                  ...baseConfig.projection,
                  layout: 'tree'
                },
                orientation: 'horizontal',
                nodeSeparation: 100,
                levelSeparation: 80
              }}
            />
          </div>
        );
      default:
        return <div>Select a visualization type</div>;
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === 'tree' ? "#007acc" : "#f0f0f0",
              color: activeTab === 'tree' ? "white" : "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
            onClick={() => setActiveTab('tree')}
          >
            File Tree
          </button>
          <button
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === 'viz' ? "#007acc" : "#f0f0f0",
              color: activeTab === 'viz' ? "white" : "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
            onClick={() => setActiveTab('viz')}
          >
            Visualizations
          </button>
        </div>

        {activeTab === 'viz' && (
          <div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <button
                style={{
                  padding: "8px 16px",
                  backgroundColor: vizType === 'eisenhower' ? "#4caf50" : "#f0f0f0",
                  color: vizType === 'eisenhower' ? "white" : "black",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
                onClick={() => setVizType('eisenhower')}
              >
                Eisenhower Matrix
              </button>
              <button
                style={{
                  padding: "8px 16px",
                  backgroundColor: vizType === 'gantt' ? "#4caf50" : "#f0f0f0",
                  color: vizType === 'gantt' ? "white" : "black",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
                onClick={() => setVizType('gantt')}
              >
                Gantt Chart
              </button>
              <button
                style={{
                  padding: "8px 16px",
                  backgroundColor: vizType === 'kanban' ? "#4caf50" : "#f0f0f0",
                  color: vizType === 'kanban' ? "white" : "black",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
                onClick={() => setVizType('kanban')}
              >
                Kanban Board
              </button>
              <button
                style={{
                  padding: "8px 16px",
                  backgroundColor: vizType === 'tree' ? "#4caf50" : "#f0f0f0",
                  color: vizType === 'tree' ? "white" : "black",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
                onClick={() => setVizType('tree')}
              >
                Dependency Tree
              </button>
            </div>

            {renderVisualization()}

            <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
              <h4>Feature Graph Statistics</h4>
              <p>Total Features: {data.featureGraph?.nodes?.length || 0}</p>
              <p>Dependencies: {data.featureGraph?.edges?.length || 0}</p>
              <p>Features with status:</p>
              <ul>
                <li>Todo: {data.featureGraph?.nodes?.filter((n: any) => n.attributes.status === 'todo').length || 0}</li>
                <li>Doing: {data.featureGraph?.nodes?.filter((n: any) => n.attributes.status === 'doing').length || 0}</li>
                <li>Done: {data.featureGraph?.nodes?.filter((n: any) => n.attributes.status === 'done').length || 0}</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'tree' && (
          <div style={{ display: "flex", gap: "20px" }}>
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
