const core = require("@actions/core");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const VALID_ACTIONS = ["plan", "apply"];

function run(command, workingDirectory) {
  core.info(`Running: ${command}`);

  execSync(command, {
    cwd: workingDirectory,
    stdio: "inherit",
  });
}

function validateInputs(action, bucket, lockTable, workingDirectory) {
  const errors = [];

  if (!action) {
    errors.push("Missing required input: action");
  } else if (!VALID_ACTIONS.includes(action)) {
    errors.push(
      `Invalid action '${action}'. Valid actions: ${VALID_ACTIONS.join(", ")}`
    );
  }

  if (!bucket) {
    errors.push("Missing required input: terraform_state_bucket_name");
  }

  if (!lockTable) {
    errors.push("Missing required input: terraform_lock_table_name");
  }

  if (!workingDirectory) {
    errors.push("Missing required input: terraform_working_directory");
  } else if (!fs.existsSync(workingDirectory)) {
    errors.push(`Terraform working directory does not exist: ${workingDirectory}`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid state-management inputs:\n${errors.join("\n")}`);
  }
}

function terraformFormatCheck(workingDirectory) {
  run("terraform fmt -check -recursive", workingDirectory);
}

function terraformInit(workingDirectory, bucket, lockTable) {
  run(
    `terraform init ` +
      `-backend-config="bucket=${bucket}" ` +
      `-backend-config="dynamodb_table=${lockTable}"`,
    workingDirectory
  );
}

function terraformValidate(workingDirectory) {
  run("terraform validate", workingDirectory);
}

function terraformPlan(workingDirectory) {
  run("terraform plan -input=false -out=tfplan", workingDirectory);
}

function terraformApply(workingDirectory) {
  run("terraform apply -input=false -auto-approve tfplan", workingDirectory);
}

function setOutputs(action, relativeWorkingDirectory) {
  core.setOutput("final_action", action);
  core.setOutput("working_directory", relativeWorkingDirectory);
}

function main() {
  try {
    const action = core.getInput("action");
    const bucket = core.getInput("terraform_state_bucket_name");
    const lockTable = core.getInput("terraform_lock_table_name");
    const relativeWorkingDirectory = core.getInput("terraform_working_directory");

    const workingDirectory = path.join(
      process.env.GITHUB_WORKSPACE,
      relativeWorkingDirectory
    );

    validateInputs(action, bucket, lockTable, workingDirectory);

    terraformFormatCheck(workingDirectory);
    terraformInit(workingDirectory, bucket, lockTable);
    terraformValidate(workingDirectory);
    terraformPlan(workingDirectory);

    if (action === "apply") {
      terraformApply(workingDirectory);
    }

    setOutputs(action, relativeWorkingDirectory);
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();