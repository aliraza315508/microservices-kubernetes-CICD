const core = require("@actions/core");
const fs = require("fs");
const { execSync } = require("child_process");

function run(command) {
  core.info(`Running: ${command}`);
  execSync(command, { stdio: "inherit" });
}

function readDeploymentMetadata(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployment metadata file not found: ${filePath}`);
  }

  const rawMetadata = fs.readFileSync(filePath, "utf8");

  try {
    return JSON.parse(rawMetadata);
  } catch (error) {
    throw new Error(`Invalid deployment metadata JSON: ${error.message}`);
  }
}

function validateMetadata(metadata) {
  const requiredFields = [
    "commit_sha",
    "short_sha",
    "image_tag",
    "aws_region",
    "aws_account_id",
    "services"
  ];

  const missingFields = [];

  for (const field of requiredFields) {
    if (metadata[field] === undefined || metadata[field] === null) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throw new Error(
      `Deployment metadata is missing required fields: ${missingFields.join(", ")}`
    );
  }

  if (!Array.isArray(metadata.services)) {
    throw new Error("Deployment metadata field 'services' must be an array");
  }

  const requiredServiceFields = [
    "service_name",
    "ecr_repository",
    "k8s_deployment",
    "k8s_container",
    "k8s_kustomize_path"
  ];

  const serviceErrors = [];

  for (const service of metadata.services) {
    const serviceName = service.service_name || "unknown";

    for (const field of requiredServiceFields) {
      if (
        service[field] === undefined ||
        service[field] === null ||
        service[field] === ""
      ) {
        serviceErrors.push(
          `Service '${serviceName}' is missing required field: ${field}`
        );
      }
    }
  }

  if (serviceErrors.length > 0) {
    throw new Error(`Invalid service metadata:\n${serviceErrors.join("\n")}`);
  }
}

function updateKubeconfig(clusterName, region) {
  run(`aws eks update-kubeconfig --region "${region}" --name "${clusterName}"`);
}

function applyCommonResources() {
  run("kubectl apply -k k8s/common");
}

function applyServiceResources(services) {
  const uniqueKustomizePaths = [
    ...new Set(services.map((service) => service.k8s_kustomize_path))
  ];

  for (const kustomizePath of uniqueKustomizePaths) {
    run(`kubectl apply -k ${kustomizePath}`);
  }
}

function applyIngressResources() {
  run("kubectl apply -k k8s/ingress");
}

function updateServiceImages(metadata, namespace) {
  const { aws_account_id: accountId, aws_region: region, image_tag: imageTag } = metadata;

  for (const service of metadata.services) {
    const imageUri =
      `${accountId}.dkr.ecr.${region}.amazonaws.com/` +
      `${service.ecr_repository}:${imageTag}`;

    run(
      `kubectl set image deployment/${service.k8s_deployment} ` +
        `${service.k8s_container}=${imageUri} ` +
        `-n ${namespace}`
    );
  }
}

function checkRollouts(services, namespace) {
  for (const service of services) {
    run(
      `kubectl rollout status deployment/${service.k8s_deployment} ` +
        `-n ${namespace} --timeout=300s`
    );
  }
}

function showResources(namespace) {
  run(`kubectl get pods -n ${namespace}`);
  run(`kubectl get svc -n ${namespace}`);
  run(`kubectl get ingress -n ${namespace}`);
}

function main() {
  try {
    const eksClusterName = core.getInput("eks_cluster_name", { required: true });
    const k8sNamespace = core.getInput("k8s_namespace", { required: true });
    const deploymentMetadataFile = core.getInput("deployment_metadata_file", {
      required: true
    });

    const metadata = readDeploymentMetadata(deploymentMetadataFile);
    validateMetadata(metadata);

    const deployedServices = metadata.services
      .map((service) => service.service_name)
      .join(",");

    core.info(`Commit SHA: ${metadata.commit_sha}`);
    core.info(`Short SHA: ${metadata.short_sha}`);
    core.info(`Image tag: ${metadata.image_tag}`);
    core.info(`AWS region: ${metadata.aws_region}`);
    core.info(`AWS account ID: ${metadata.aws_account_id}`);
    core.info(`Services to deploy: ${deployedServices || "none"}`);

    core.setOutput("full_sha", metadata.commit_sha);
    core.setOutput("short_sha", metadata.short_sha);
    core.setOutput("image_tag", metadata.image_tag);
    core.setOutput("deployed_services", deployedServices);

    updateKubeconfig(eksClusterName, metadata.aws_region);

    if (metadata.services.length === 0) {
      core.info("No services found in deployment metadata. Nothing to deploy.");
      showResources(k8sNamespace);
      return;
    }

    applyCommonResources();
    applyServiceResources(metadata.services);
    applyIngressResources();
    updateServiceImages(metadata, k8sNamespace);
    checkRollouts(metadata.services, k8sNamespace);
    showResources(k8sNamespace);
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();