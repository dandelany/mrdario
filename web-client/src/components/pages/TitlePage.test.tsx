import * as React from "react";
import { act } from "react";
import { createRoot, Root } from "react-dom/client";

import TitlePage from "./TitlePage";

jest.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>
}));

describe("TitlePage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders the main title and menu options", () => {
    act(() => {
      root.render(<TitlePage />);
    });

    expect(container.textContent).toContain("Mr. Dario");
    expect(container.textContent).toContain("Single Player");
    expect(container.textContent).toContain("Play Online");
    expect(container.textContent).toContain("High Scores");
  });
});
