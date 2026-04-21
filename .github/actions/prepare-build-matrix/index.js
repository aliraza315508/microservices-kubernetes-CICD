const core = require("@actions/core");
const { execSync } = require("child_process");

// All services for matrix
const ALL_SERVICES = [
  {
    service_name: "naming-server",
    service_path: "naming-server",
    ecr_repository: "naming-server"
  },
  {
    service_name: "api-gateway",
    service_path: "api-gateway",
    ecr_repository: "api-gateway"
  },
  {
    service_name: "currency-exchange-service",
    service_path: "currency-exchange-service",
    ecr_repository: "currency-exchange-service"
  },
  {
    service_name: "currency-conversion-service",
    service_path: "currency-conversion-service",
    ecr_repository: "currency-conversion-service"
  }
];

// Get previous commit SHA
function getPreviousSha(currentSha) {
  try {
    return execSync(`git rev-parse ${currentSha}^`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

// Get changed files
function getChangedFiles(previousSha, currentSha) {
  const output = execSync(
    `git diff --name-only ${previousSha} ${currentSha}`,
    { encoding: "utf8" }
  );

  return output
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

// Build matrix based on changed files
function buildMatrix(changedFiles) {
  const workflowFiles = [
    ".github/workflows/ci.yml",
    ".github/workflows/docker-build-push-exchange.yml"
  ];

  if (changedFiles.some(file => workflowFiles.includes(file))) {
    return ALL_SERVICES;
  }

  const selected = [];

  ALL_SERVICES.forEach(service => {
    if (changedFiles.some(file => file.startsWith(service.service_path + "/"))) {
      selected.push(service);
    }
  });

  return selected;
}

// Main function
function run() {
  try {
    const currentSha = core.getInput("current_sha", { required: true });
    core.info(`Current SHA: ${currentSha}`);

    const previousSha = getPreviousSha(currentSha);
    core.info(`Previous SHA: ${previousSha || "none"}`);

    let matrix;

    if (!previousSha) {
      core.info("No previous commit found -> building all services");
      matrix = ALL_SERVICES;
    } else {
      const changedFiles = getChangedFiles(previousSha, currentSha);
      core.info("Changed Files:");
      changedFiles.forEach(f => core.info(f));
      matrix = buildMatrix(changedFiles);
    }

    core.info(`Selected services: ${matrix.map(s => s.service_name).join(",") || "none"}`);

    core.setOutput("build_matrix", JSON.stringify(matrix));
    core.setOutput("changed_count", matrix.length.toString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();