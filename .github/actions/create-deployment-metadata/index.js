const core = require("@actions/core");
const fs = require("fs");
const path = require("path") ;

function parseBuildMatrix(rawBuildMatrix) {
  try {
    const services = JSON.parse(rawBuildMatrix);

    if (!Array.isArray(services)) {
      throw new Error("build_matrix must be JSON array");
    }

    return services;
  } catch (error) {
    throw new Error(`Invalid build_matrix JSON: ${error.message}`);
  }
}


function createDeploymentMetadata({
commitSha,
buildMatrix,
awsRegion,
awsAccountId
}){
const shortSha = commitSha.substring(0,7);

return{
    commit_sha: commitSha,
    short_sha: shortSha,
    image_tag: `sha-${shortSha}`,
    aws_region: awsRegion,
    aws_account_id: awsAccountId,
    services: buildMatrix
} ;
}

function writeJsonFile(filePath, data) {
  const directory = path.dirname(filePath);

  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}


function main() {
  try {
    const commitSha = core.getInput("commit_sha", { required: true });
    const rawBuildMatrix = core.getInput("build_matrix", { required: true });
    const awsRegion = core.getInput("aws_region", { required: true });
    const awsAccountId = core.getInput("aws_account_id", { required: true });
    const outputFile =
      core.getInput("output_file") ||
      "deployment-metadata/deployment-metadata.json";

    const buildMatrix = parseBuildMatrix(rawBuildMatrix);

    const metadata = createDeploymentMetadata({
      commitSha,
      buildMatrix,
      awsRegion,
      awsAccountId
    });

    writeJsonFile(outputFile, metadata);

    core.info("Deployment metadata created:");
    core.info(JSON.stringify(metadata, null, 2));

    core.setOutput("metadata_file", outputFile);
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();