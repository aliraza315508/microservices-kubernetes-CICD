const core = require("@actions/core");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const STACK_ORDER = ["vpc", "database", "eks", "workflow-b"];

const CONFIG = {
  validActions: ["plan", "apply"],

  stackOrder: STACK_ORDER,

  stackDirectories: {
    "vpc": "terraform/vpc",
    "database": "terraform/database",
    "eks": "terraform/eks",
    "workflow-b": "terraform/workflow-b"
  },

  changeRules: [
    ["terraform/vpc/", STACK_ORDER],
    ["terraform/database/", ["database"]],
    ["terraform/eks/", ["eks", "workflow-b"]],
    ["terraform/workflow-b/", ["workflow-b"]],
    [".github/actions/run-terraform-infrastructure/", STACK_ORDER],
    [".github/workflows/infrastructure-creation-workflow.yml", STACK_ORDER]
  ]
};

// Runs a shell command and streams output directly to GitHub Actions logs.
function run(command, cwd = process.cwd()) {
  core.info(`Running: ${command}`);

  execSync(command, {
    stdio: "inherit",
    cwd,
    env: process.env
  });
}

// Runs a shell command and returns its output as text.
// Used when JavaScript needs to read command output.
function getOutput(command, cwd = process.cwd()) {
  core.info(`Running: ${command}`);

  return execSync(command, {
    encoding: "utf8",
    cwd,
    env: process.env
  }).trim();
}

// Validates the final Terraform action and stack input.
// Collects all validation errors before failing.
function validateInputs(action, stack) {
  const errors = [];
  const validStacks = ["auto", "all", ...CONFIG.stackOrder];

  if (!CONFIG.validActions.includes(action)) {
    errors.push(
      `Invalid action '${action}'. Valid actions: ${CONFIG.validActions.join(", ")}`
    );
  }

  if (!validStacks.includes(stack)) {
    errors.push(
      `Invalid stack '${stack}'. Valid stacks: ${validStacks.join(", ")}`
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid Terraform infrastructure inputs:\n${errors.join("\n")}`
    );
  }
}

// Selects which Terraform stacks should run.
// Manual choices return immediately.
// stack=auto detects changed files and applies CONFIG.changeRules.
function selectStacks(stackInput) {
  if (stackInput === "all") {
    return [...CONFIG.stackOrder];
  }

  if (CONFIG.stackOrder.includes(stackInput)) {
    return [stackInput];
  }

  let changedFiles = [];

  try {
    changedFiles = getOutput("git diff --name-only HEAD~1 HEAD")
      .split("\n")
      .map((file) => file.trim())
      .filter(Boolean);
  } catch (error) {
    core.warning(
      "Could not detect changed files using HEAD~1..HEAD. Falling back to empty changed file list."
    );
  }

  if (changedFiles.length === 0) {
    core.info("No changed files detected.");
    return [];
  }

  core.info("Changed files:");

  for (const file of changedFiles) {
    core.info(`- ${file}`);
  }

  const selectedStacks = new Set();

  for (const [pathPrefix, affectedStacks] of CONFIG.changeRules) {
    const matched = changedFiles.some((file) => {
      if (pathPrefix.endsWith("/")) {
        return file.startsWith(pathPrefix);
      }

      return file === pathPrefix;
    });

    if (matched) {
      core.info(`Matched change rule: ${pathPrefix}`);

      for (const stack of affectedStacks) {
        selectedStacks.add(stack);
      }
    }
  }

  return CONFIG.stackOrder.filter((stack) => selectedStacks.has(stack));
}

// Runs Terraform for one selected stack.
// It checks the stack directory exists, then runs fmt, init, validate,
// then either plan or plan+apply.
function runTerraformStack(stack, action, bucket, lockTable) {
  const relativeStackDir = CONFIG.stackDirectories[stack];

  if (!relativeStackDir) {
    throw new Error(`No Terraform directory configured for stack: ${stack}`);
  }

  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const stackDir = path.join(workspace, relativeStackDir);

  if (!fs.existsSync(stackDir)) {
    throw new Error(`Terraform directory does not exist: ${stackDir}`);
  }

  const backendConfigs = [];

  if (bucket) {
    backendConfigs.push(`-backend-config="bucket=${bucket}"`);
  }

  if (lockTable) {
    backendConfigs.push(`-backend-config="dynamodb_table=${lockTable}"`);
  }

  const terraformInitCommand =
    backendConfigs.length > 0
      ? `terraform init ${backendConfigs.join(" ")}`
      : "terraform init";

  core.info("==================================================");
  core.info(`Terraform stack: ${stack}`);
  core.info(`Terraform action: ${action}`);
  core.info(`Terraform directory: ${relativeStackDir}`);
  core.info("==================================================");

  run("terraform fmt -check", stackDir);
  run(terraformInitCommand, stackDir);
  run("terraform validate", stackDir);

  if (action === "plan") {
    run("terraform plan -input=false", stackDir);
    return;
  }

  run("terraform plan -input=false -out=tfplan", stackDir);
  run("terraform apply -input=false -auto-approve tfplan", stackDir);
}

// Sets outputs so the workflow can show summary information.
function setOutputs(action, selectedStacks) {
  core.setOutput("final_action", action);
  core.setOutput("selected_stacks", selectedStacks.join(" "));
  core.setOutput("should_run", selectedStacks.length > 0 ? "true" : "false");
}

// Main execution flow.
// Push events always run plan+auto.
// Manual workflow_dispatch uses the selected action and stack.
function main() {
  try {
    const eventName = process.env.GITHUB_EVENT_NAME || "";

    const inputAction =
      core.getInput("action", { required: false }) || "plan";

    const inputStack =
      core.getInput("stack", { required: false }) || "auto";

    const bucket = core.getInput("terraform_state_bucket_name", {
      required: false
    });

    const lockTable = core.getInput("terraform_lock_table_name", {
      required: false
    });

    const action = eventName === "push" ? "plan" : inputAction;
    const stackInput = eventName === "push" ? "auto" : inputStack;

    validateInputs(action, stackInput);

    core.info(`GitHub event: ${eventName}`);
    core.info(`Input action: ${inputAction}`);
    core.info(`Input stack: ${inputStack}`);
    core.info(`Final Terraform action: ${action}`);
    core.info(`Final stack mode: ${stackInput}`);

    const selectedStacks = selectStacks(stackInput);
    setOutputs(action, selectedStacks);

    if (selectedStacks.length === 0) {
      core.info("No Terraform infrastructure stacks selected. Nothing to run.");
      return;
    }

    core.info(`Selected stacks: ${selectedStacks.join(" ")}`);

    for (const stack of selectedStacks) {
      runTerraformStack(stack, action, bucket, lockTable);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();