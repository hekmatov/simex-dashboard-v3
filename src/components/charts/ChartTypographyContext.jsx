import React from "react";

export const ChartTypographyContext = React.createContext(null);
export function useChartTypography() { return React.useContext(ChartTypographyContext); }
