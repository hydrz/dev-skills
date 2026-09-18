// @ts-check

// Copy and adapt this file only after confirming the repository's real module
// layout. Each immediate child of MODULES_ROOT is treated as one module. Files
// at a module root are public entry points; nested paths are private.

const MODULES_ROOT = "src/modules";
const root = MODULES_ROOT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const moduleFiles = `^${root}/([^/]+)/`;
const moduleInternals = `^${root}/[^/]+/[^/]+/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-importing-module-internals-from-outside",
      comment: "Import another module through one of its root entry points.",
      severity: "error",
      from: { pathNot: moduleFiles },
      to: { path: moduleInternals },
    },
    {
      name: "no-importing-other-module-internals",
      comment: "Modules may use their own internals but not another module's internals.",
      severity: "error",
      from: { path: moduleFiles },
      to: {
        path: moduleInternals,
        pathNot: `^${root}/$1/`,
      },
    },
    {
      name: "no-circular-dependencies",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  },
};
