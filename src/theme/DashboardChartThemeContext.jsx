import React from "react";

const DashboardChartThemeContext = React.createContext(null);

export function DashboardChartThemeProvider({ projection, children }) {
  return React.createElement(
    DashboardChartThemeContext.Provider,
    { value: projection ?? null },
    children,
  );
}

export function useDashboardChartTheme() {
  return React.useContext(DashboardChartThemeContext);
}
