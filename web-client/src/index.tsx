import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "@/components/App";

const rootEl = document.getElementById("container");
const root = rootEl ? createRoot(rootEl) : null;

root?.render(<App />);

// Hot Module Replacement API
declare let module: { hot: any };

if (module.hot) {
  module.hot.accept("./components/App", () => {
    const NewApp = require("./components/App").default;

    root?.render(<NewApp />);
  });
}
