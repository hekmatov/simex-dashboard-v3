import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  createChartDraft,
} from "../src/charting/config/chartConfigV3.js";
import {
  analyzeGeographyJoin,
} from "../src/charting/data/geographyJoin.js";
import {
  applyGeographySourceSelection,
  validatedGeoSourceOptions,
} from "../src/charting/forms/geographySource.js";
import {
  planChartConversion,
} from "../src/charting/forms/chartConversion.js";
import {
  buildEditorFormModel,
  buildFormPreparationKey,
} from "../src/charting/forms/formModel.js";
import {
  listChartSchemas,
} from "../src/charting/schemas/chartSchemaRegistry.js";
import {
  buildChartCatalogue,
} from "../src/lib/quorumCatalogue.js";

const schemaTypes = await import("../src/charting/schemas/schemaTypes.js");
const conversionAuthority = await import(
  "../src/charting/forms/conversionContract.js"
).catch(() => ({}));
const geographyAuthority = await import(
  "../src/charting/data/geographyBindingContract.js"
).catch(() => ({}));

const EXPECTED_CONVERSION_RULES = Object.freeze({
  version: 1,
  compatible_when: [
    "same_type",
    "source_declares_target_compatible",
  ],
  otherwise: "remap",
  preserve_roles_when: [
    "same_role_id",
    "target_accepts_assignment",
  ],
  missing_required_target_roles: "require_binding",
});

const EXPECTED_GEOGRAPHY_CONTRACT = Object.freeze({
  version: 1,
  data_source: {
    descriptor_kind: "geojson",
    presentation_field: "geoSource",
    required: true,
  },
  geography_role_id: "geography",
  join: {
    presentation_field: "joinField",
    explicit_strategy: "feature_property",
    inferred_strategies: [
      "feature_id",
      "unique_best_feature_property",
    ],
    default_strategy: null,
    feature_id_precedence: "score_at_least_best_property",
    ambiguous_property_match: "requires_explicit_selection",
  },
});

const EXPECTED_FORM_SECTIONS = Object.freeze([
  {
    id: "data",
    label: "Data",
    cataloguePresentation: false,
    advanced: false,
  },
  {
    id: "appearance",
    label: "Appearance",
    cataloguePresentation: true,
    advanced: false,
  },
  {
    id: "labels",
    label: "Labels",
    cataloguePresentation: true,
    advanced: false,
  },
  {
    id: "axes",
    label: "Axes",
    cataloguePresentation: true,
    advanced: false,
  },
  {
    id: "targets",
    label: "Targets",
    cataloguePresentation: true,
    advanced: false,
  },
  {
    id: "map",
    label: "Map",
    cataloguePresentation: true,
    advanced: false,
  },
  {
    id: "timeline",
    label: "Timeline",
    cataloguePresentation: true,
    advanced: false,
  },
  {
    id: "collection",
    label: "Collection",
    cataloguePresentation: true,
    advanced: false,
  },
  {
    id: "interactions",
    label: "Interactions",
    cataloguePresentation: false,
    advanced: false,
  },
  {
    id: "advanced",
    label: "Advanced",
    cataloguePresentation: true,
    advanced: true,
  },
]);

test("one conversion authority drives runtime planning and the bounded catalogue contract", async () => {
  assert.deepEqual(
    conversionAuthority.CHART_CONVERSION_CONTRACT,
    EXPECTED_CONVERSION_RULES,
  );

  const { dashboard, aliases } = await trackedInputs();
  const catalogue = buildChartCatalogue(dashboard, aliases);
  const descriptors = new Map(
    catalogue.chart_types.map((descriptor) => [
      descriptor.type_id,
      descriptor,
    ]),
  );
  const schemas = listChartSchemas();

  for (const source of schemas) {
    const sourceRoles = maximalRoleAssignments(source);
    const chart = {
      typeId: source.typeId,
      roles: sourceRoles,
      transformations: {},
      presentation: {},
      interaction: {},
    };
    const conversion = descriptors.get(source.typeId).conversion;
    assert.deepEqual(
      conversion.compatible_type_ids,
      [...source.conversions].toSorted(),
    );
    assert.deepEqual(conversion.rules, EXPECTED_CONVERSION_RULES);

    for (const target of schemas) {
      const plan = planChartConversion(chart, target.typeId);
      const expectedKind = (
        source.typeId === target.typeId
        || source.conversions.includes(target.typeId)
      )
        ? "compatible"
        : "remap";
      assert.equal(
        plan.kind,
        expectedKind,
        `${source.typeId} -> ${target.typeId} classification`,
      );
      assert.deepEqual(
        Object.keys(plan.preservedRoles).toSorted(),
        expectedPreservedRoleIds(sourceRoles, target),
        `${source.typeId} -> ${target.typeId} preserved roles`,
      );
      assert.deepEqual(
        plan.requiredRoles.map(({ id }) => id),
        expectedRequiredRoleIds(sourceRoles, target),
        `${source.typeId} -> ${target.typeId} required roles`,
      );
    }
  }
});

test("KPI to Bullet is a remap while exposing required target binding work", () => {
  const chart = {
    typeId: "kpi",
    roles: {
      value: { field: "current", interpretation: "number" },
      target: { field: "target", interpretation: "number" },
      entity: { field: "facility", interpretation: "category" },
    },
    transformations: {},
    presentation: {},
    interaction: {},
  };
  const plan = planChartConversion(chart, "bullet");

  assert.equal(plan.kind, "remap");
  assert.deepEqual(Object.keys(plan.preservedRoles).toSorted(), [
    "entity",
    "target",
  ]);
  assert.deepEqual(plan.requiredRoles.map(({ id }) => id), ["actual"]);
});

test("the configured current-cases KPI excludes the retired Bullet conversion while retaining its role plan", async () => {
  const { dashboard, aliases } = await trackedInputs();
  const chart = configuredChart(
    dashboard,
    "bio_current_cases_kpi",
  );
  const plan = planChartConversion(chart, "bullet");
  const bullet = listChartSchemas().find(
    ({ typeId }) => typeId === "bullet",
  );
  const kpiDescriptor = buildChartCatalogue(
    dashboard,
    aliases,
  ).chart_types.find(({ type_id }) => type_id === "kpi");

  assert.equal(kpiDescriptor.conversion.compatible_type_ids.includes("bullet"), false);
  assert.deepEqual(
    kpiDescriptor.conversion.rules,
    EXPECTED_CONVERSION_RULES,
  );
  assert.equal(plan.kind, "remap");
  assert.deepEqual(Object.keys(plan.preservedRoles), ["label", "time"]);
  assert.deepEqual(plan.requiredRoles.map(({ id }) => id), [
    "actual",
    "target",
  ]);
  assert.deepEqual(
    Object.keys(plan.preservedRoles).toSorted(),
    expectedPreservedRoleIds(chart.roles, bullet),
  );
  assert.deepEqual(
    plan.requiredRoles.map(({ id }) => id),
    expectedRequiredRoleIds(chart.roles, bullet),
  );
});

test("one geography authority describes and executes feature-id and property joins honestly", async () => {
  assert.deepEqual(
    geographyAuthority.GEOGRAPHY_BINDING_CONTRACT,
    EXPECTED_GEOGRAPHY_CONTRACT,
  );

  const { dashboard, aliases } = await trackedInputs();
  const catalogue = buildChartCatalogue(dashboard, aliases);
  const geographyTypes = catalogue.chart_types.filter(
    ({ data_family }) => data_family === "geography",
  );
  assert.ok(geographyTypes.length > 0);
  for (const descriptor of geographyTypes) {
    assert.deepEqual(
      descriptor.geography,
      EXPECTED_GEOGRAPHY_CONTRACT,
      descriptor.type_id,
    );
  }

  const geoData = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { municipality_code: "A" },
        geometry: null,
      },
      {
        type: "Feature",
        properties: { municipality_code: "B" },
        geometry: null,
      },
    ],
  };
  const chart = createChartDraft("choroplethMap", {
    id: "property-only-map",
    title: "Property-only map",
    sourceId: "measurements",
    roles: {
      geography: {
        field: "municipality",
        interpretation: "geographic",
      },
      value: { field: "value" },
    },
  });
  const rows = [
    { municipality: "A", value: 10 },
    { municipality: "B", value: 20 },
  ];

  assert.deepEqual(
    validatedGeoSourceOptions(
      {
        boundaries: {
          kind: "geojson",
          provenance: { label: "Boundaries" },
        },
        notBoundaries: { kind: "csv" },
      },
      { boundaries: geoData },
    ),
    [{ value: "boundaries", label: "Boundaries" }],
  );
  assert.deepEqual(analyzeGeographyJoin({ chart, rows, geoData }), {
    status: "ready",
    joinField: "municipality_code",
    inferred: true,
    propertyFields: ["municipality_code"],
  });
  assert.equal(
    applyGeographySourceSelection(chart, {
      sourceId: "boundaries",
      geoData,
      rows,
    }).presentation.map.joinField,
    "municipality_code",
  );
});

test("one form-section registry drives UI labels and catalogue presentation sections for all types", async () => {
  assert.deepEqual(
    schemaTypes.CHART_FORM_SECTION_DEFINITIONS,
    EXPECTED_FORM_SECTIONS,
  );
  assert.deepEqual(
    schemaTypes.CHART_FORM_SECTIONS,
    EXPECTED_FORM_SECTIONS.map(({ id }) => id),
  );

  const { dashboard, aliases } = await trackedInputs();
  const catalogue = buildChartCatalogue(dashboard, aliases);
  const descriptorByType = new Map(
    catalogue.chart_types.map((descriptor) => [
      descriptor.type_id,
      descriptor,
    ]),
  );
  const definitionById = new Map(
    EXPECTED_FORM_SECTIONS.map((definition) => [
      definition.id,
      definition,
    ]),
  );
  for (const schema of listChartSchemas()) {
    assert.deepEqual(
      descriptorByType.get(schema.typeId).presentation_section_ids,
      schema.form.sections.filter(
        (sectionId) => definitionById
          .get(sectionId).cataloguePresentation,
      ),
      schema.typeId,
    );
  }

  const chart = createChartDraft("line", {
    id: "form-authority",
    title: "Form authority",
    sourceId: "measurements",
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: {
        field: "date",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
  });
  const profile = {
    fingerprint: "form-authority-profile",
    columns: [
      {
        name: "date",
        type: "temporal",
        temporal: {
          parsingMetadata: {
            interpretation: "temporal",
            format: "YYYY-MM-DD",
            timezone: "date-only",
          },
          values: ["2027-05-01"],
          diagnostics: [],
        },
      },
      { name: "value", type: "numeric" },
    ],
  };
  const prepared = {
    status: "ready",
    marks: [{ x: "2027-05-01", value: 1 }],
    diagnostics: [],
    meta: {
      renderableMarkCount: 1,
      duplicateGroupCount: 0,
      formPreparationKey: buildFormPreparationKey({ chart, profile }),
    },
  };
  const model = buildEditorFormModel({ chart, profile, prepared });
  for (const section of model.sections) {
    const definition = definitionById.get(section.id);
    assert.equal(section.label, definition.label);
    assert.equal(section.advanced, definition.advanced);
  }
});

async function trackedInputs() {
  const [dashboard, aliases] = await Promise.all([
    readJson("public/config/dashboard.json"),
    readJson("public/config/chart-aliases.json"),
  ]);
  return { dashboard, aliases };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function maximalRoleAssignments(schema) {
  return Object.fromEntries(schema.roles.map((role) => {
    const interpretation = role.accepts.includes("any")
      ? "category"
      : role.accepts[0];
    const binding = {
      field: `${schema.typeId}_${role.id}`,
      interpretation,
    };
    return [
      role.id,
      role.max === null ? [binding] : binding,
    ];
  }));
}

function configuredChart(dashboard, chartId) {
  return dashboard.pages
    .flatMap((page) => page.sections)
    .flatMap((section) => section.panels)
    .map((panel) => panel.chart ?? panel)
    .find(({ id }) => id === chartId);
}

function expectedPreservedRoleIds(sourceRoles, target) {
  return target.roles
    .filter((role) => (
      Object.hasOwn(sourceRoles, role.id)
      && assignmentAcceptedByRole(sourceRoles[role.id], role)
    ))
    .map(({ id }) => id)
    .toSorted();
}

function expectedRequiredRoleIds(sourceRoles, target) {
  const preserved = new Set(expectedPreservedRoleIds(sourceRoles, target));
  return target.roles
    .filter((role) => role.min > 0 && !preserved.has(role.id))
    .map(({ id }) => id);
}

function assignmentAcceptedByRole(assignment, role) {
  const bindings = Array.isArray(assignment)
    ? assignment
    : assignment === undefined || assignment === null
      ? []
      : [assignment];
  if (
    bindings.length < role.min
    || (role.max !== null && bindings.length > role.max)
    || (role.max === null) !== Array.isArray(assignment)
  ) {
    return false;
  }
  return bindings.every((binding) => (
    binding.interpretation === undefined
    || role.accepts.includes("any")
    || role.accepts.includes(binding.interpretation)
  ));
}
