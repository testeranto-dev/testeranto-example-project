import { ITestAdapter } from "testeranto.tiposkripto/CoreTypes";

export const adapter: ITestAdapter<I> = {
  beforeAll: async (input, testResource, artifactory) => {
    console.log("[adapter] beforeAll called with input:", input);
    return input;
  },
  beforeEach: async (subject, initializer, testResource, initialValues, artifactory) => {
    console.log("[adapter] beforeEach called with subject:", subject);
    // The initializer should create and return a Calculator instance
    const calculator = await initializer();
    console.log("[adapter] beforeEach created calculator:", calculator);
    if (!calculator) {
      throw new Error("Initializer failed to create a Calculator instance");
    }
    return calculator;
  },
  andWhen: async (store, whenCB, testResource, artifactory) => {
    console.log("[adapter] andWhen called with store:", store);
    if (!store) {
      throw new Error("Store is undefined in andWhen");
    }
    const updatedStore = whenCB(store);
    console.log("[adapter] andWhen updated store:", updatedStore);
    // Ensure we always return a valid store
    return updatedStore || store;
  },
  butThen: async (store, thenCB, testResource, artifactory) => {
    console.log("[adapter] butThen called with store:", store);
    if (!store) {
      throw new Error("Store is undefined in butThen");
    }
    // Call the assertion function with the store
    // This will perform the assertion (e.g., assert.equal)
    console.log("[adapter] butThen calling thenCB with store");
    thenCB(store);
    
    // Return the store itself
    return store;
  },
  afterEach: async (store, key, artifactory) => {
    console.log("[adapter] afterEach called with store:", store);
    return store;
  },
  afterAll: async (store, artifactory) => {
    console.log("afterAll called, but skipping web-only storage operations in Node.js");
    artifactory.writeFileSync("foo", "bar")
    artifactory.screenshot("screenshot")
    return store;
  },
  assertThis: (actual: string) => {
    console.log("[adapter] assertThis called with actual:", actual);
    return actual;
  },
};
