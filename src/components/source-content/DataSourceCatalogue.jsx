import React from "react";
import ContentCatalogue from "./ContentCatalogue.jsx";

export default function DataSourceCatalogue(props) {
  return <ContentCatalogue {...props} label="Data source catalogue" searchLabel="Search data sources" addLabel="Add data source" kindOptions={["csv", "geojson"]} />;
}
