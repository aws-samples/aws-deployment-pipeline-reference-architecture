import { CodePipelineSource } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { Repository, Code } from 'aws-cdk-lib/aws-codecommit';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { IgnoreMode } from 'aws-cdk-lib';
import { CfnRepositoryAssociation } from 'aws-cdk-lib/aws-codegurureviewer';
import * as fs from 'fs';

export interface CodeCommitSourceProps {
  repositoryName: string;
  trunkBranchName?: string;
  associateCodeGuru?: boolean;
}

export interface ExternalSourceProps {
  owner: string;
  repositoryName: string;
  trunkBranchName: string;
  associateCodeGuru?: boolean;
  connectionArn: string;
}

export class CodeCommitSource extends Construct {
  //repository: Repository;
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
    const repository = new Repository(this, 'CodeCommitRepo', {
      repositoryName: props.repositoryName,
      code: Code.fromAsset(codeAsset, this.trunkBranchName),
    });

    if (props.associateCodeGuru !== false) {
      new CfnRepositoryAssociation(this, 'CfnRepositoryAssociation', {
        name: repository.repositoryName,
        type: 'CodeCommit',
      });
    }
    this.codePipelineSource = CodePipelineSource.codeCommit(repository, this.trunkBranchName);
  }
}
export class ExternalSource extends Construct {
  codePipelineSource: CodePipelineSource;
  trunkBranchName: string;

  constructor(scope: Construct, id: string, props: ExternalSourceProps) {
    super(scope, id);
    this.trunkBranchName = props?.trunkBranchName || 'main';
    console.log(props.owner, props.repositoryName);
    // Create CodePipeline source from GitHub using CodeStar Connection
    this.codePipelineSource = CodePipelineSource.connection(
      `${props.owner}/${props.repositoryName}`, // GitHub repository path
      this.trunkBranchName,                     // Branch name
      {
        connectionArn: props.connectionArn,      // CodeStar Connection ARN
      },
    
    );
    

  }
}