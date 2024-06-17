import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PipelineStack } from '../src/pipeline-stack';

const context = {
  workloadName: 'food',
  dynamicConfigAccount: '123456789012',
  workloadEnvironments: [
    {
      name: 'alpha',
      workloadOrganizationPath: 'o-wtyjfv84ln/r-sg8d/ou-sg8d-ejjbxgod/ou-sg8d-xiaxfcr0',
      waves: [
        {
          name: 'alpha',
          regions: ['us-west-2'],
        },
      ],
    },
    {
      name: 'beta',
      workloadOrganizationPath: 'o-wtyjfv84ln/r-sg8d/ou-sg8d-ejjbxgod/ou-sg8d-xiaxfcr0',
      waves: [
        {
          name: 'beta',
          regions: ['us-west-2'],
        },
      ],
    },
    {
      name: 'gamma',
      workloadOrganizationPath: 'o-wtyjfv84ln/r-sg8d/ou-sg8d-ejjbxgod/ou-sg8d-4cqhcezd',
      waves: [
        {
          name: 'gamma',
          regions: ['us-east-1', 'eu-central-1'],
        },
      ],
    },
    {
      name: 'prod',
      workloadOrganizationPath: 'o-wtyjfv84ln/r-sg8d/ou-sg8d-ejjbxgod/ou-sg8d-kbps96iq',
      waves: [
        {
          name: 'Prod-Americas',
          regions: ['us-east-1', 'us-west-2'],
        },
        {
          name: 'Prod-Europe',
          regions: ['eu-central-1', 'eu-west-1'],
        },
      ],
    },
  ],
};

test('Pipeline resources created', () => {
  const app = new cdk.App({ context: context });
  const stack = new PipelineStack(app, 'DynamicConfigurationPipeline', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::KMS::Key', 1);
  template.resourceCountIs('AWS::S3::Bucket', 1);
  template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
  template.resourceCountIs('AWS::CodeBuild::Project', 5);
  template.hasResourceProperties('AWS::CodeBuild::Project', {
    Environment: {
      ComputeType: 'BUILD_GENERAL1_SMALL',
      Image: 'aws/codebuild/standard:7.0',
      ImagePullCredentialsType: 'CODEBUILD',
      PrivilegedMode: false,
      Type: 'LINUX_CONTAINER',
    },
  });
});
