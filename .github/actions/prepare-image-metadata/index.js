const core = require("@actions/core");

function createAllTags({
  awsAccountId,
  awsRegion,
  ecrRepository,
  commitSha
}) {
  const shortSha = commitSha.substring(0, 7);
  const imageUri = `${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${ecrRepository}`;

  const latestFullImage = `${imageUri}:latest`;
  const shaFullImage = `${imageUri}:sha-${shortSha}`;

  return `${latestFullImage}\n${shaFullImage}`;
}

function main() {
  try {
    const awsAccountId = core.getInput("aws_account_id", { required: true });
    const awsRegion = core.getInput("aws_region", { required: true });
    const ecrRepository = core.getInput("ecr_repository", { required: true });
    const commitSha = core.getInput("commit_sha", { required: true });

    const allTags = createAllTags({
      awsAccountId,
      awsRegion,
      ecrRepository,
      commitSha
    });

    core.info("Docker image tags:");
    core.info(allTags);

    core.setOutput("all_tags", allTags);
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();