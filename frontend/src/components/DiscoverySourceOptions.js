import React from "react";
import sources from "../data/discoverySources.json";

export default function DiscoverySourceOptions() {
  return <>
    <option value="">Select</option>
    {sources.map(source => <option key={source} value={source}>{source}</option>)}
  </>;
}
