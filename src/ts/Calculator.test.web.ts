import Tiposkripto from "testeranto.tiposkripto/web";

import { Calculator } from "./Calculator.js";
import { adapter } from "./Calculator.test.adapter.js";
import { implementation } from "./Calculator.test.implementation.js";
import { specification } from "./Calculator.test.specification.js";
import { ICalculatorNode, O, M } from "./Calculator.test.types.js";

export default Tiposkripto<ICalculatorNode, O, M>(
  Calculator,
  specification,
  implementation,
  adapter,
  { ports: 1000 }
);
