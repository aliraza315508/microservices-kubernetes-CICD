const core = require("@actions/core");
const { execSync } = require("child_process");

const ALL_SERVICES = [
  {
    service_name: "naming-server",
    service_path: "naming-server",
    ecr_repository: "naming-server",
    k8s_deployment: "naming-server",
    k8s_container: "naming-server",
    k8s_kustomize_path: "k8s/naming-server"
  },
  {
    service_name: "api-gateway",
    service_path: "api-gateway",
    ecr_repository: "api-gateway",
    k8s_deployment: "api-gateway",
    k8s_container: "api-gateway",
    k8s_kustomize_path: "k8s/api-gateway"
  },
  {
    service_name: "currency-exchange-service",
    service_path: "currency-exchange-service",
    ecr_repository: "currency-exchange-service",
    k8s_deployment: "currency-exchange",
    k8s_container: "currency-exchange",
    k8s_kustomize_path: "k8s/currency-exchange"
  },
  {
    service_name: "currency-conversion-service",
    service_path: "currency-conversion-service",
    ecr_repository: "currency-conversion-service",
    k8s_deployment: "currency-conversion",
    k8s_container: "currency-conversion",
    k8s_kustomize_path: "k8s/currency-conversion"
  }
];

function getPreviousSha(currentSha) {
  try {
    return execSync(`git rev-parse ${currentSha}^`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch (error) {
    core.warning("Could not find previous commit. This may be the first commit.");
    return "";
  }
}

function getChangedFiles(previousSha, currentSha) {
  if (!previousSha) {
    core.info("No previous SHA found. Building all services.");
    return ["BUILD_ALL"];
  }

  const output = execSync(`git diff --name-only ${previousSha} ${currentSha}`, {
    encoding: "utf8"
  });

  return output
    .split("\n")
    .map(file => file.trim())
    .filter(Boolean);
}

function shouldBuildAll(changedFiles) {
  if (changedFiles.includes("BUILD_ALL")) {
    return true;
  }

  const buildAllFiles = [
    ".github/workflows/workflow-b-docker-build-push.yml",

    ".github/actions/prepare-build-matrix/action.yml",
    ".github/actions/prepare-build-matrix/index.js",
    ".github/actions/prepare-build-matrix/package.json",
    ".github/actions/prepare-build-matrix/package-lock.json",

    ".github/actions/prepare-image-metadata/action.yml",
    ".github/actions/prepare-image-metadata/index.js",
    ".github/actions/prepare-image-metadata/package.json",
    ".github/actions/prepare-image-metadata/package-lock.json",

    ".github/actions/create-deployment-metadata/action.yml",
    ".github/actions/create-deployment-metadata/index.js",
    ".github/actions/create-deployment-metadata/package.json",
    ".github/actions/create-deployment-metadata/package-lock.json"
  ];

  return changedFiles.some(file => buildAllFiles.includes(file));
}

function buildMatrix(changedFiles) {
  if (shouldBuildAll(changedFiles)) {
    core.info("Workflow/action files changed. Building all services.");
    return ALL_SERVICES;
  }

  if (changedFiles.some(file => file.startsWith("k8s/common/"))) {
    core.info("Common Kubernetes files changed. Building all services.");
    return ALL_SERVICES;
  }

  const selectedServices = [];

  ALL_SERVICES.forEach(service => {
    const sourceChanged = changedFiles.some(file =>
      file.startsWith(`${service.service_path}/`)
    );

    const k8sChanged = changedFiles.some(file =>
      file.startsWith(`${service.k8s_kustomize_path}/`)
    );

    if (sourceChanged || k8sChanged) {
      selectedServices.push(service);
    }
  });

  return selectedServices;
}

function main() {
  try {
    const currentSha = core.getInput("current_sha", { required: true });

    core.info(`Current SHA: ${currentSha}`);

    const previousSha = getPreviousSha(currentSha);

    if (previousSha) {
      core.info(`Previous SHA: ${previousSha}`);
    }

    const changedFiles = getChangedFiles(previousSha, currentSha);

    core.info("Changed files:");
    changedFiles.forEach(file => core.info(`- ${file}`));

    const matrix = buildMatrix(changedFiles);

    core.info("Selected services:");
    matrix.forEach(service => core.info(`- ${service.service_name}`));

    core.setOutput("build_matrix", JSON.stringify(matrix));
    core.setOutput("changed_count", matrix.length.toString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();