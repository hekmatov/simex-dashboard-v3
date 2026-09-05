import React from "react";
import { createRoot } from "react-dom/client";

import PdpcReleaseHeader from "../../src/release/PdpcReleaseHeader.jsx";
import "../../src/styles/tokens.css";
import "../../src/styles.css";
import "../../src/styles/modes.css";
import "../../src/release/pdpc-release.css";

const variant = new URLSearchParams(location.search).get("variant") ?? "biomedical";
const discipline = variant === "socioeconomic" ? "socio_economic" : "biomedical";
const profile = { id: `pdpc-${variant}`, variant };
const labels = {
  scenario: "Scenario",
  biomedical: "Biomedical",
  socio_economic: "Socio-economic",
};
const pages = ["scenario", discipline].map((id) => ({ id, title: labels[id] }));

function Harness() {
  const [activePage, setActivePage] = React.useState(pages[0]);
  return (
    <div className="app-frame" data-release-profile={profile.id}>
      <PdpcReleaseHeader
        profile={profile}
        pages={pages}
        activePage={activePage}
        onPageRequest={(id) => setActivePage(pages.find((page) => page.id === id))}
      />
      <main className="pdpc-release-harness-content" data-canonical-page-id={activePage.id}>
        <h1>{activePage.title}</h1>
        <div aria-hidden="true" style={{ height: "1400px" }} />
        <button id="pdpc-release-focus-target" type="button">End-of-page action</button>
        <div aria-hidden="true" style={{ height: "900px" }} />
      </main>
    </div>
  );
}

createRoot(document.querySelector("#root")).render(<Harness />);
