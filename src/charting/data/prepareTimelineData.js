import {
  consolidateCandidates,
  firstRoleBinding,
  groupMetadata,
  readRoleValue,
  stableKey,
} from "./transforms.js";

export function prepareTimelineData({ chart, rows, datasetProfile, transformed }) {
  const roles = Object.fromEntries(["event", "start", "end", "lane", "status"].map((id) => [id, firstRoleBinding(chart, id)]));
  const candidates = rows.map((row) => ({
    event: readRoleValue(row, roles.event, datasetProfile),
    start: readRoleValue(row, roles.start, datasetProfile),
    end: readRoleValue(row, roles.end, datasetProfile),
    lane: readRoleValue(row, roles.lane, datasetProfile),
    status: readRoleValue(row, roles.status, datasetProfile),
    ...groupMetadata(row, transformed, datasetProfile),
  }));
  return consolidateCandidates(
    candidates,
    (mark) => stableKey(mark.event, mark.start, mark.end, mark.lane, mark.status, mark.groupKey),
    transformed,
    (group) => group[0],
  );
}
