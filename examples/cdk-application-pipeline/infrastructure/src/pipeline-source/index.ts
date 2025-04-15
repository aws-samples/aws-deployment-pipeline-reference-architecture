import * as fs from 'fs';
import { IgnoreMode, Stack } from 'aws-cdk-lib';
import { Code, Repository } from 'aws-cdk-lib/aws-codecommit';
import { CfnRepositoryAssociation } from 'aws-cdk-lib/aws-codegurureviewer';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';

export interface CodeCommitSourceProps {
  repositoryName: string;
  trunkBranchName?: string;
  associateCodeGuru?: boolean;
}

export class CodeCommitSource extends Construct {
  repository: Repository;
  trunkBranchName: string;
  codePipelineSource: CodePipelineSource;
  constructor(scope: Construct, id: string, props: CodeCommitSourceProps) {
    super(scope, id);
    this.trunkBranchName = props?.trunkBranchName || 'main';
    let gitignore = fs.readFileSync('.gitignore').toString().split(/\r?\n/);
    gitignore.push('.git/');

    // Allow canary code to package properly
    // see: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary_Nodejs.html#CloudWatch_Synthetics_Canaries_package
    gitignore = gitignore.filter(g => g != 'node_modules/');
    gitignore.push('/node_modules/');

    const codeAsset = new Asset(this, 'SourceAsset', {
      path: '.',
      ignoreMode: IgnoreMode.GIT,
      exclude: gitignore,
    });
    this.repository = new Repository(this, 'CodeCommitRepo', {
      repositoryName: props.repositoryName,
      code: Code.fromAsset(codeAsset, this.trunkBranchName),
    });

    if (props.associateCodeGuru !== false) {
      new CfnRepositoryAssociation(this, 'CfnRepositoryAssociation', {
        name: this.repository.repositoryName,
        type: 'CodeCommit',
      });
    }
    this.codePipelineSource = CodePipelineSource.codeCommit(this.repository, this.trunkBranchName);
  }
}
export class CodePipelineSourceFactory{  
  static createCodePipelineSource(pipelineStack: Stack){  
    const providerType = pipelineStack.node.tryGetContext("providerType")==undefined?"codecommit":pipelineStack.node.tryGetContext("providerType");  

    switch(providerType){  
      case 'codecommit':  
        const appName = pipelineStack.node.tryGetContext('appName')  
        if(!appName){  
          throw new Error('appName is required')  
        }  
        // CodeCommitSource is an instance of Construct  
        return new CodeCommitSource(pipelineStack, 'Source', {repositoryName: appName}).codePipelineSource
      default:  
        const repoParameters = {  
          "owner": pipelineStack.node.tryGetContext('owner'),  
          "repositoryName": pipelineStack.node.tryGetContext('repositoryName'),  
          "trunkBranchName": pipelineStack.node.tryGetContext('trunkBranchName'),  
          "connectionArn": pipelineStack.node.tryGetContext('connectionArn'),  
        };  

        // CodePipelineSource is not an instance of Construct  
        return CodePipelineSource.connection(  
          `${repoParameters.owner}/${repoParameters.repositoryName}`,  
          repoParameters.trunkBranchName ?? 'main',  
          { connectionArn: repoParameters.connectionArn }  
        )
    }  
  }
}