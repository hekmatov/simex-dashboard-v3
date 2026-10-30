import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryPresentationKey, seriesPresentationKey, resolveOrderedKeys,
  resolveLegendEntries, captureSeriesColors,
  normalizeKeyedPresentation, normalizePresentationOrder,
} from "../src/charting/presentation/categorySeriesPresentation.js";

test("V3 #20 #28 new presentation records reject active and malformed data", () => {
  assert.deepEqual(normalizeKeyedPresentation({ a: { label: "  " }, b: { label: " Label " } }, "legend"), { b: { label: "Label" } });
  let evaluated = false;
  const active = Object.defineProperty({}, "label", { enumerable: true, get() { evaluated = true; return "Bad"; } });
  assert.throws(() => normalizeKeyedPresentation({ a: active }, "legend"));
  const order = ["a"];
  Object.defineProperty(order, "0", { enumerable: true, get() { evaluated = true; return "a"; } });
  assert.throws(() => normalizePresentationOrder(order));
  assert.equal(evaluated, false);
  for (const value of [["a", "a"], [1], [""], new Array(1), { 0: "a" }]) assert.throws(() => normalizePresentationOrder(value));
});

test("V3 #20 #28 labels order and colors follow stable identities", () => {
  assert.notEqual(categoryPresentationKey(1), categoryPresentationKey("1"));
  assert.notEqual(categoryPresentationKey(false), categoryPresentationKey("false"));
  const a = { measure: "actual", measureLabel: "Alias", clusterKey: "A", axis: "primary" };
  const b = { ...a, measure: "target", axis: "secondary" };
  const ak = seriesPresentationKey(a), bk = seriesPresentationKey(b);
  assert.equal(seriesPresentationKey({ ...a, measureLabel: "Changed alias", value: 90 }), ak);
  assert.notEqual(ak, bk);
  const order = [bk, "absent", ak];
  assert.deepEqual(resolveOrderedKeys([ak, bk, "new"], order), [bk, ak, "new"]);
  assert.deepEqual(resolveOrderedKeys([ak, "new"], order), [ak, "new"]);
  assert.deepEqual(resolveOrderedKeys([ak, bk, "new"], order), [bk, ak, "new"]);
  assert.deepEqual(resolveOrderedKeys([ak, bk], undefined), [ak, bk]);
  assert.deepEqual(order, [bk, "absent", ak]);
  const descriptors = [{ key: ak, defaultLabel: "Actual" }, { key: bk, defaultLabel: "Target" }];
  const settings = { [ak]: { label: "Same", visible: false }, [bk]: { label: "Same" } };
  const legend = resolveLegendEntries(descriptors, settings);
  assert.deepEqual(legend.all.map(e => [e.key, e.label, e.visible]), [[ak, "Same", false], [bk, "Same", true]]);
  assert.deepEqual(legend.visible.map(e => e.key), [bk]);
  assert.equal(resolveLegendEntries(descriptors, { [ak]: { label: "  " } }).all[0].label, "Actual");
  assert.deepEqual(captureSeriesColors(descriptors, { colors: ["#123456", "#abcdef"], overrides: { dormant: { color: "#111111" } } }), {
    dormant: { color: "#111111" }, [ak]: { color: "#123456" }, [bk]: { color: "#abcdef" },
  });
});
