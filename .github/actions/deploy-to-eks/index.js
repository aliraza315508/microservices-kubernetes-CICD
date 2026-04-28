const core = require("@actions/core");
const { execSync } = require("child_process") ;

function run(command) {
  core.info(`Running: ${command}`);
  execSync(command, { stdio: "inherit" });
}

function getFullSha(){
const eventName = process.env.GITHUB_EVENT_NAME;

if(eventName === "workflow_run"){
const workflowRunSha = process.env.WORKFLOW_RUN_HEAD_SHA || "" ;
if(workflowRunSha){
return workflowRunSha ;
}
}

return process.env.GITHUB_SHA || "";
}

function updateKubeconfig(clusterName, region) {
  run(`aws eks update-kubeconfig --region "${region}" --name "${clusterName}"`);
}

function applyK8sResources() {
  run(`kubectl apply -k k8s/common`);
  run(`kubectl apply -k k8s/naming-server`);
  run(`kubectl apply -k k8s/currency-exchange`);
  run(`kubectl apply -k k8s/currency-conversion`);
  run(`kubectl apply -k k8s/api-gateway`);
  run(`kubectl apply -k k8s/ingress`);
}


function updateImages(accountId, region, namespace, imageTag) {
  run(
    `kubectl set image deployment/naming-server ` +
      `naming-server=${accountId}.dkr.ecr.${region}.amazonaws.com/naming-server:${imageTag} ` +
      `-n ${namespace}`
  );

  run(
    `kubectl set image deployment/api-gateway ` +
      `api-gateway=${accountId}.dkr.ecr.${region}.amazonaws.com/api-gateway:${imageTag} ` +
      `-n ${namespace}`
  );

  run(
    `kubectl set image deployment/currency-exchange ` +
      `currency-exchange=${accountId}.dkr.ecr.${region}.amazonaws.com/currency-exchange-service:${imageTag} ` +
      `-n ${namespace}`
  );

  run(
    `kubectl set image deployment/currency-conversion ` +
      `currency-conversion=${accountId}.dkr.ecr.${region}.amazonaws.com/currency-conversion-service:${imageTag} ` +
      `-n ${namespace}`
  );
}

function checkRollout(namespace) {
  run(`kubectl rollout status deployment/naming-server -n ${namespace} --timeout=300s`);
  run(`kubectl rollout status deployment/currency-exchange -n ${namespace} --timeout=300s`);
  run(`kubectl rollout status deployment/currency-conversion -n ${namespace} --timeout=300s`);
  run(`kubectl rollout status deployment/api-gateway -n ${namespace} --timeout=300s`);
}

function showResources(namespace) {
run (`kubectl get pods -n ${namespace}`);
run(`kubectl get svc -n ${namespace}`);
run(`kubectl get ingress -n ${namespace}`);
}

function main() {
try{
 const awsRegion = core.getInput("aws_region" , {required: true }) ;
 const awsAccountId = core.getInput("aws_account_id" , {required: true }) ;
 const eksClusterName = core.getInput("eks_cluster_name" , {required: true});
 const k8sNamespace = core.getInput("k8s_namespace", { required: true });

 const fullSha = getFullSha() ;

 if (!fullSha) {
      throw new Error("Could not determine commit SHA.");
    }

 const shortSha = fullSha.substring(0,7) ;
 const imageTag = `sha-${shortSha}` ;

     core.info(`Full SHA: ${fullSha}`);
     core.info(`Short SHA: ${shortSha}`);
     core.info(`Image tag: ${imageTag}`);

     core.setOutput("full_sha", fullSha);
     core.setOutput("short_sha", shortSha);
     core.setOutput("image_tag", imageTag);

     updateKubeconfig(eksClusterName, awsRegion);
     applyK8sResources();
     updateImages(awsAccountId, awsRegion, k8sNamespace, imageTag);
     checkRollout(k8sNamespace);
     showResources(k8sNamespace);


}catch(error){
core.setFailed(error.message) ;
}
}

main() ;