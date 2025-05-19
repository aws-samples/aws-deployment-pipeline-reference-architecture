import {prompts, prompt} from "prompts";
import {CodeConnectionsClient, CreateConnectionCommand, ProviderType, GetConnectionCommand} from "@aws-sdk/client-codeconnections";
import * as child from "child_process";


async function main() {
    console.log("This script will help you create a connection to an external version control system");
    try {
        const source = await promptSourceType();
        console.log(source)
        let cmd = 'npx cdk deploy --profile toolchain --all --require-approval never';
        if (source != 'codecommit') {
            const repoParameters = (await promptExternalSourceParamters(source));
            const command = await setupCodeConnection(source, repoParameters);
            console.log("The connection is created to connect the external version control system");
            await checkForCodeConnectionAvailable(repoParameters, 30, 10, command.ConnectionArn);
            repoParameters["connectionArn"]=command.ConnectionArn
            repoParameters["providerType"]=source
            await updateCdkJson(repoParameters)
            cmd=cmd.concat(` -c owner=${repoParameters.owner} -c repositoryName=${repoParameters.repositoryName} -c trunckBranchname=${repoParameters.trunkBranchName} -c connectionArn=${command.ConnectionArn} -c providerType=${source}`)
        }
        else {
            console.log("No external paramters required, proceeding with codecommit");
        }
        console.log(cmd)
        const commandParts = cmd.split(/\s+/);
        const resp = child.spawnSync(commandParts[0], commandParts.slice(1),{ stdio: 'inherit' });
        console.log(resp);
        if (resp.status !== 0) {
            throw new Error(`${resp.status} - Error`);
        }
    }catch (e) {
        console.error(e);
        process.exit(1);
    }
}

async function promptSourceType() {
  const source = prompts.select({
      type: 'select',
      name: 'source',
      message: 'Select pipeline source',
      choices: [
          { title: 'GitHub', value: ProviderType.GITHUB.toString() },
          { title: 'BitBucket', value: ProviderType.BITBUCKET.toString() },
          { title: 'Github Enterprise Server', value: ProviderType.GITHUB_ENTERPRISE_SERVER.toString() },
          { title: 'CodeCommit', value: 'codecommit' },
      ],
  }) as unknown as string;
  return source;
}

async function promptExternalSourceParamters(source :string) {
  const externalSourcePrompts= [
    {
        type: 'text',
        name:'profile',
        message: `Enter your AWS CLI profile name or ( Press ENTER to choose toolchain as default profile )`,
        default: 'toolchain'
    },
    {
        type: 'text',
        name: 'owner',
        message: `Enter ${source} owner`,
    },
    {
        type: 'text',
        name: 'repositoryName',
        message: `Enter ${source} repository name`,
    },
    {
        type: 'text',
        name: 'trunkBranchName',
        message: `Enter ${source} trunk branch name`,
    }
  ]
  
  const response= prompt(externalSourcePrompts);
  return response
}

async function setupCodeConnection( source: String, repoParameters: any){
    const client = new CodeConnectionsClient({ region: process.env.AWS_REGION ,profile:repoParameters.profile });
    let input = {
        ProviderType: source as ProviderType,
        ConnectionName: `dpri-${source}-${repoParameters.owner}`,
    };
    const command = new CreateConnectionCommand(input);
    const response = await client.send(command);
    return response
}

async function checkForCodeConnectionAvailable(
    repoParameters: any,
    maxRetries: number = 30,
    delay: number = 10,
    connectionArn:any

): Promise<boolean> {
    console.log("\n Waiting for connection to become available ...")
    console.log ("\n Please complete the authorization in the console when prompted")

    const client = new CodeConnectionsClient({ region: process.env.AWS_REGION ,profile:repoParameters.profile });

    for ( let attempt = 0; attempt < maxRetries; attempt ++ ){
        try{
            const getConnectionCommand = new GetConnectionCommand({
                ConnectionArn: connectionArn
            });
            const response = await client.send(getConnectionCommand);
            const status = response.Connection?.ConnectionStatus;

            if (response.Connection?.ConnectionStatus === "AVAILABLE") {
                console.log("\n Connection is available");
                return true;
            }
            else if (response.Connection?.ConnectionStatus == "ERROR"){
                console.log("\n Connection is not available yet. Retrying ...")
                await new Promise(resolve => setTimeout(resolve, delay * 1000));
            
            }
            console.log(`\n⏳ Current status: ${status} (Attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay * 1000));

        }catch(error){
            console.error(`Error checking connection status: ${error}`);
            return false;
        }
    } 
    throw new Error(`Connection not available after ${maxRetries} attempts`);
}

// create function to read cdk.json and add update context values as per prompt response
function updateCdkJson(repoParameters: any) {
    const fs = require('fs');
    const cdkJson = JSON.parse(fs.readFileSync('cdk.json', 'utf8'));
    cdkJson.context.owner = repoParameters.owner;
    cdkJson.context.repositoryName = repoParameters.repositoryName;
    cdkJson.context.trunkBranchName = repoParameters.trunkBranchName;
    cdkJson.context.connectionArn = repoParameters.connectionArn;
    cdkJson.context.providerType = repoParameters.providerType;
    fs.writeFileSync('cdk.json', JSON.stringify(cdkJson, null, 2));
   
}

main().catch(console.error);