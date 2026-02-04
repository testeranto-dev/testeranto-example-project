console.log("hello calcualtor test")
// import Tiposkripto from "../src/lib/tiposkripto/Tiposkripto";


import { Calculator } from "./Calculator.js";
console.log("hello Calculator", Calculator)

import Tiposkripto from "tiposkripto";
console.log("hello Tiposkripto", Tiposkripto)

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
