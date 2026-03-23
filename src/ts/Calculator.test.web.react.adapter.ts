
import { ICalculatorWeb } from "./Calculator.test.types.js";
import { ITestAdapter } from "testeranto.tiposkripto/CoreTypes";
import ReactDOM from "react-dom/client"
import React from "react";
import { Calculator } from "./Calculator.js";

// Wrapper component that calls done when mounted
class TesterantoComponent extends React.Component {
  done: (component: TesterantoComponent) => void;
  constructor(props: any) {
    super(props);
    this.done = props.done;
  }
  componentDidMount() {
    super.componentDidMount?.();
    this.done(this);
  }

  render() {
    return React.createElement(this.props.subject, this.props);
  }
}

export const adapter: ITestAdapter<ICalculatorWeb> = {
  beforeAll: async (reactElement, tr, artifactory): Promise<any> => {
    console.log("[React adapter] beforeAll");
    
    // Start screencast for the entire test suite
    if (artifactory) {
      await artifactory.openScreencast(`test_suite_recording`);
    }
    
    // Get or create root element
    let htmlElement = document.getElementById("root");
    if (!htmlElement) {
      htmlElement = document.createElement("div");
      htmlElement.id = "root";
      document.body.appendChild(htmlElement);
      console.log("[React adapter] Created root element");
    }
    console.log("[React adapter] htmlElement:", htmlElement);

    const testhtmlElement = document.createElement("div");
    testhtmlElement.innerText ="hello adapter"
    // Store the reactElement for use in beforeEach
    // Don't create domRoot here - it will be created in beforeEach when needed
    return { htmlElement, reactElement };
  },
  beforeEach: async (subject, initializer, testResource, initialValues, artifactory) => {
    console.log("[React adapter] beforeEach called with subject:", subject);
    console.log("[React adapter] initializer type:", typeof initializer);
    console.log("[React adapter] initialValues:", initialValues);
    
    const { htmlElement, reactElement } = subject;
    
    // Always create a new root to ensure clean state
    // First, unmount any existing content
    if (subject.domRoot) {
      subject.domRoot.unmount();
      console.log("[React adapter] Unmounted previous root");
    }
    
    // Create a new root
    const domRoot = ReactDOM.createRoot(htmlElement);
    
    return new Promise((resolve, reject) => {
      try {
        // Get the initial props from the initializer
        console.log("[React adapter] Getting initial props...");
        let initProps;
        if (typeof initializer === 'function') {
          initProps = initializer();
        } else if (initialValues && typeof initialValues === 'object') {
          // Try to extract props from initialValues
          initProps = initialValues;
        } else {
          // Default props
          initProps = { props: { initialValue: '' } };
        }
        
        console.log("[React adapter] Initial props:", initProps);
        
        // The CalculatorUI expects props
        const props = initProps.props || {};
        
        // Create the wrapper component
        const element = React.createElement(
          TesterantoComponent,
          {
            ...props,
            subject: reactElement, // The CalculatorUI component
            done: (reactElement) => {
              console.log("[React adapter] Component mounted");
              resolve({
                htmlElement,
                reactElement,
                domRoot,
                // Store the props for reference
                props: props
              });
            },
          },
          []
        );

        // Render using the new root
        console.log("[React adapter] Rendering element...");
        domRoot.render(element);
      } catch (err) {
        console.error("[React adapter] Error in beforeEach:", err);
        console.error("[React adapter] Error name:", err.name);
        console.error("[React adapter] Error message:", err.message);
        console.error("[React adapter] Error stack:", err.stack);
        reject(err);
      }
    });
  },
  andWhen: async (store, whenCB, testResource, artifactory) => {
    console.log("[React adapter] andWhen called with store:", store);

    artifactory.screenshot(`niceShotandWhen`);

    if (!store) {
      throw new Error("Store is undefined in andWhen");
    }
    // The whenCB now expects store, testResource, and artifactory
    const updatedStore = await whenCB(store, testResource, artifactory);
    console.log("[React adapter] andWhen updated store:", updatedStore);
    
    // Wait for React to potentially re-render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update the htmlElement reference to ensure we have the latest DOM
    if (updatedStore && updatedStore.htmlElement) {
      return updatedStore;
    }
    
    // If updatedStore doesn't have htmlElement, try to get it from the original store
    if (store && store.htmlElement) {
      return { ...store, ...updatedStore };
    }
    
    return updatedStore || store;
  },
  butThen: async (store, thenCB, testResource, artifactory) => {
    artifactory.screenshot(`niceShotButThen`);
    console.log("[React adapter] butThen called with store:", store);
    if (!store) {
      throw new Error("Store is undefined in butThen");
    }
    // The thenCB now expects store, testResource, and artifactory
    await thenCB(store, testResource, artifactory);
    return store;
  },
  afterEach: async (store, key, artifactory) => {
    console.log("[React adapter] afterEach called with store:", store);
    
    // This is stupid and wrong.
    // Wait for the calculator UI to be visible
    // Check for the display element
    await new Promise(resolve => {
      const checkDisplay = () => {
        const display = document.querySelector('[style*="displayValue"]') || 
                       document.querySelector('div[style*="display"]') ||
                       document.querySelector('.calculator') ||
                       document.getElementById('root')?.querySelector('div');
        if (display) {
          console.log("[React adapter] Found display element");
          resolve(true);
        } else {
          console.log("[React adapter] Display element not found, waiting...");
          setTimeout(checkDisplay, 100);
        }
      };
      checkDisplay();
    });
    
    // Additional wait for any animations
    await new Promise(resolve => setTimeout(resolve, 500));
    
    artifactory.screenshot(`niceShotAfterEach`);
    
    // Unmount the React component to ensure clean state for next test
    if (store?.domRoot) {
      store.domRoot.unmount();
      console.log("[React adapter] Unmounted React component after test");
      // Remove domRoot from store so beforeEach creates a new one
      delete store.domRoot;
    }
    
    return store;
  },
  afterAll: async (store, artifactory) => {
    console.log("[React adapter] afterAll called");
    
    // Unmount React component
    if (store?.domRoot) {
      store.domRoot.unmount();
      console.log("[React adapter] Unmounted React component");
    }
    // Clean up root element
    if (store?.htmlElement) {
      store.htmlElement.remove();
      console.log("[React adapter] Removed root element");
    }
    if (artifactory) {
      artifactory.writeFileSync("asd", "qwer");
      // Wait a bit before taking final screenshot
      await new Promise(resolve => setTimeout(resolve, 500));
      // Add timestamp to make screenshot filename unique
      artifactory.screenshot(`niceShotAfterAll`);
      // Stop screencast for the entire test suite
      await artifactory.closeScreencast(`test_suite_recording`);
    }
    return store;
  },
  assertThis: (actual: string) => {
    console.log("[React adapter] assertThis called with actual:", actual);
    return actual;
  },
};
