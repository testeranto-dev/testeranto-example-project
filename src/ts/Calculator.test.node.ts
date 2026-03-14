import Tiposkripto from "testeranto.tiposkripto/node";

import { Calculator } from "./Calculator.js";
import { adapter } from "./Calculator.test.adapter.js";
import { implementation } from "./Calculator.test.implementation.js";
import { specification } from "./Calculator.test.specification.js";
import { I, O, M } from "./Calculator.test.types.js";

export default Tiposkripto<I, O, M>(
  Calculator,
  specification,
  implementation,
  adapter,
  { ports: 1000 }
);
