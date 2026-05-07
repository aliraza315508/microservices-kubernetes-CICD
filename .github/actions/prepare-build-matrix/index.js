const core = require("@actions/core");
const { execSync } = require("child_process");

const BUILD_ALL_MARKER = "BUILD_ALL";

const COMMON_K8S_PATH = "k8s/common/";

const WORKFLOW_B_FILE = ".github/workflows/workflow-b-docker-build-push.yml";

const BUILD_MATRIX_ACTION_DIR = ".github/actions/prepare-build-matrix";
const IMAGE_METADATA_ACTION_DIR = ".github/actions/prepare-image-metadata";
const DEPLOYMENT_METADATA_ACTION_DIR = ".github/actions/create-deployment-metadata";

const ACTION_FILES = [
  "action.yml",
  "index.js",
  "package.json",
  "package-lock.json"
];

function createActionFiles(actionDirectory) {
  return ACTION_FILES.map(fileName => `${actionDirectory}/${fileName}`);
}

const BUILD_ALL_FILES = [
  WORKFLOW_B_FILE,

  ...createActionFiles(BUILD_MATRIX_ACTION_DIR),
  ...createActionFiles(IMAGE_METADATA_ACTION_DIR),
  ...createActionFiles(DEPLOYMENT_METADATA_ACTION_DIR)
];

function createService(name) {
  return {
    service_name: name,
    service_path: name,
    ecr_repository: name,
    k8s_deployment: name,
    k8s_container: name,
    k8s_kustomize_path: `k8s/${name}`
  };
}

const ALL_SERVICES = [
  createService("naming-server"),
  createService("api-gateway"),
  createService("currency-exchange-service"),
  createService("currency-conversion-service")
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
    return [BUILD_ALL_MARKER];
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
  if (changedFiles.includes(BUILD_ALL_MARKER)) {
    return true;
  }

  return changedFiles.some(file => BUILD_ALL_FILES.includes(file));
}

function buildMatrix(changedFiles) {
  if (shouldBuildAll(changedFiles)) {
    core.info("Workflow/action files changed. Building all services.");
    return ALL_SERVICES;
  }

  if (changedFiles.some(file => file.startsWith(COMMON_K8S_PATH))) {
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

    if (matrix.length === 0) {
      core.info("No service-related changes detected. No Docker images will be built.");
    } else {
      core.info("Selected services:");
      matrix.forEach(service => core.info(`- ${service.service_name}`));
    }

    core.setOutput("build_matrix", JSON.stringify(matrix));
    core.setOutput("changed_count", matrix.length.toString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();