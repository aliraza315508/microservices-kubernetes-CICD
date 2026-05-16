const core = require("@actions/core");
const fs = require("fs");
const { execSync } = require("child_process");

// Runs a shell command and streams the output to GitHub Actions logs.
function run(command) {
  core.info(`Running: ${command}`);
  execSync(command, { stdio: "inherit" });
}

// Runs a shell command and returns the output as a string.
function runAndGetOutput(command) {
  core.info(`Running: ${command}`);
  return execSync(command, { encoding: "utf8" }).trim();
}

// Reads and parses the deployment metadata JSON file.
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

// Validates required top-level metadata fields and required service fields.
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

// Updates kubeconfig so kubectl can connect to the target EKS cluster.
function updateKubeconfig(clusterName, region) {
  run(`aws eks update-kubeconfig --region "${region}" --name "${clusterName}"`);
}

// Applies shared Kubernetes resources such as namespace and base configmap.
function applyCommonResources() {
  run("kubectl apply -k k8s/common");
}

// Applies Zipkin resources before application services start sending traces.
function applyZipkinResources() {
  run("kubectl apply -k k8s/zipkin");
}

// Applies Kubernetes manifests only for the services selected for deployment.
function applyServiceResources(services) {
  const uniqueKustomizePaths = [
    ...new Set(services.map((service) => service.k8s_kustomize_path))
  ];

  for (const kustomizePath of uniqueKustomizePaths) {
    run(`kubectl apply -k ${kustomizePath}`);
  }
}

// Applies ingress resources after service resources are applied.
function applyIngressResources() {
  run("kubectl apply -k k8s/ingress");
}

// Reads DB host, port, and DB name from AWS RDS.
function getDatabaseConnectionInfo(dbInstanceIdentifier, region) {
  const rawDatabaseInfo = runAndGetOutput(
    `aws rds describe-db-instances ` +
      `--db-instance-identifier "${dbInstanceIdentifier}" ` +
      `--region "${region}" ` +
      `--query "DBInstances[0].{host:Endpoint.Address,port:Endpoint.Port,dbName:DBName}" ` +
      `--output json`
  );

  let databaseInfo;

  try {
    databaseInfo = JSON.parse(rawDatabaseInfo);
  } catch (error) {
    throw new Error(`Invalid RDS database info JSON: ${error.message}`);
  }

  const missingFields = [];

  if (!databaseInfo.host) missingFields.push("DB_HOST");
  if (!databaseInfo.port) missingFields.push("DB_PORT");
  if (!databaseInfo.dbName) missingFields.push("DB_NAME");

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required RDS values from AWS: ${missingFields.join(", ")}`
    );
  }

  return {
    dbHost: databaseInfo.host,
    dbPort: databaseInfo.port.toString(),
    dbName: databaseInfo.dbName
  };
}

// Creates or updates the common-config ConfigMap with non-sensitive app config.
function createOrUpdateCommonConfig(namespace, databaseInfo) {
  const manifest = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: "common-config",
      namespace
    },
    data: {
      EUREKA_CLIENT_SERVICEURL_DEFAULTZONE:
        "http://naming-server:8761/eureka",
      CONFIG_SERVER_URL: "",
      DB_HOST: databaseInfo.dbHost,
      DB_PORT: databaseInfo.dbPort,
      DB_NAME: databaseInfo.dbName,
      ZIPKIN_ENDPOINT: "http://zipkin:9411/api/v2/spans",
      TRACING_SAMPLING_PROBABILITY: "1.0",
      MANAGEMENT_TRACING_ENABLED: "true"
    }
  };

  fs.mkdirSync(".runtime-k8s", { recursive: true });

  fs.writeFileSync(
    ".runtime-k8s/common-config.json",
    JSON.stringify(manifest, null, 2)
  );

  run("kubectl apply -f .runtime-k8s/common-config.json");
}

// Creates or updates the app-secrets Secret with sensitive DB credentials.
function createOrUpdateAppSecrets(
  namespace,
  dbUsername,
  dbPassword,
  jwtSecret,
  jwtUsername,
  jwtPassword,
  jwtExpirationMinutes
) {
  const missingSecrets = [];

  if (!dbUsername) missingSecrets.push("DB_USERNAME");
  if (!dbPassword) missingSecrets.push("DB_PASSWORD");
  if (!jwtSecret) missingSecrets.push("JWT_SECRET");
  if (!jwtUsername) missingSecrets.push("JWT_USERNAME");
  if (!jwtPassword) missingSecrets.push("JWT_PASSWORD");

  const finalJwtExpirationMinutes = jwtExpirationMinutes || "60";

  if (missingSecrets.length > 0) {
    throw new Error(`Missing required secret inputs: ${missingSecrets.join(", ")}`);
  }

  const manifest = {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: "app-secrets",
      namespace
    },
    type: "Opaque",
    stringData: {
      DB_USERNAME: dbUsername,
      DB_PASSWORD: dbPassword,
      JWT_SECRET: jwtSecret,
      JWT_USERNAME: jwtUsername,
      JWT_PASSWORD: jwtPassword,
      JWT_EXPIRATION_MINUTES: finalJwtExpirationMinutes
    }
  };

  fs.mkdirSync(".runtime-k8s", { recursive: true });

  fs.writeFileSync(
    ".runtime-k8s/app-secrets.json",
    JSON.stringify(manifest, null, 2)
  );

  run("kubectl apply -f .runtime-k8s/app-secrets.json");
}

// Updates each selected Kubernetes deployment with the new ECR image tag.
function updateServiceImages(metadata, namespace) {
  const { aws_account_id: accountId, aws_region: region, image_tag: imageTag } =
    metadata;

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

// Waits for each selected Kubernetes deployment rollout to complete.
function checkRollouts(services, namespace) {
  for (const service of services) {
    run(
      `kubectl rollout status deployment/${service.k8s_deployment} ` +
        `-n ${namespace} --timeout=300s`
    );
  }
}

// Shows current pods, services, and ingress resources in the namespace.
function showResources(namespace) {
  run(`kubectl get pods -n ${namespace}`);
  run(`kubectl get svc -n ${namespace}`);
  run(`kubectl get ingress -n ${namespace}`);
}

// Runs the deploy action: reads inputs, validates metadata, deploys services, and shows resources.
function main() {
  try {
    const eksClusterName = core.getInput("eks_cluster_name", { required: true });
    const k8sNamespace = core.getInput("k8s_namespace", { required: true });

    const deploymentMetadataFile = core.getInput("deployment_metadata_file", {
      required: true
    });

    const dbInstanceIdentifier = core.getInput("db_instance_identifier", {
      required: true
    });

    const dbUsername = core.getInput("db_username", { required: true });
    const dbPassword = core.getInput("db_password", { required: true });
    const jwtSecret = core.getInput("jwt_secret", { required: true });
    const jwtUsername = core.getInput("jwt_username", { required: true });
    const jwtPassword = core.getInput("jwt_password", { required: true });
    const jwtExpirationMinutes = core.getInput("jwt_expiration_minutes") || "60";

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

    applyCommonResources();
    applyZipkinResources();

    const databaseInfo = getDatabaseConnectionInfo(
      dbInstanceIdentifier,
      metadata.aws_region
    );

    createOrUpdateCommonConfig(k8sNamespace, databaseInfo);

    createOrUpdateAppSecrets(
      k8sNamespace,
      dbUsername,
      dbPassword,
      jwtSecret,
      jwtUsername,
      jwtPassword,
      jwtExpirationMinutes
    );

    if (metadata.services.length === 0) {
      core.info("No services found in deployment metadata. Config and secrets were updated.");
      showResources(k8sNamespace);
      return;
    }

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