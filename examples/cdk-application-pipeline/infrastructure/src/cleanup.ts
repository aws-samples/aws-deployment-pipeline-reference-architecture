#!/usr/bin/env ts-node

import * as child from 'child_process';
import { CloudFormationClient, CloudFormationServiceException, DeleteStackCommand, DescribeStacksCommand, waitUntilStackDeleteComplete } from '@aws-sdk/client-cloudformation';
import { ECR } from '@aws-sdk/client-ecr';
import { S3Client, DeleteBucketCommand, DeleteObjectsCommand, GetBucketLocationCommand, ListBucketsCommand, ListObjectsCommand, ListObjectVersionsCommand, NoSuchBucket } from '@aws-sdk/client-s3';
import { STS } from '@aws-sdk/client-sts';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { loadSharedConfigFiles } from '@aws-sdk/shared-ini-file-loader';
import { prompts } from 'prompts';
import { Account } from './accounts';
import { accounts, Beta, Gamma, Prod } from './pipeline';


async function main() {
  // make sure all accounts are setup
  for (const accountName of ['toolchain', 'beta', 'gamma', 'production'] as const) {
    const account = accounts[accountName];
    accounts[accountName] = await promptAccount(`Select AWS profile for '${accountName}' account`, account?.profile);
  }
  Beta.account = accounts.beta;
  Gamma.account = accounts.gamma;
  Prod.account = accounts.production;
  accounts.store();

  const commands: string[] = [];
  const toolchainRegion = await getRegion(accounts.toolchain!.profile);

  // Destroy CDK App
  commands.push(`npx cdk destroy --profile ${accounts.toolchain!.profile} --all --force`);
  await deletePipelineBuckets(accounts.toolchain!.profile, toolchainRegion);
  for (let command of commands) {
    console.log(command);
    const commandParts = command.split(/\s+/);
    const resp = child.spawnSync(commandParts[0], commandParts.slice(1), { stdio: 'inherit' });
    if (resp.status !== 0) {
      throw new Error(`${resp.status} - Error`);
    }
  }

  // Delete toolchain CDKToolkit stack
  await deleteCdkToolkitStack(accounts.toolchain!.profile, toolchainRegion);

  // Delete beta, gamma, prod waves App and CDKToolkit stacks
  for (let account of [Beta, Gamma, Prod]) {
    for (let region of account.waves.flat()) {
      await deleteAppStack(account.name, account.account?.profile!, region);
      await deleteCdkToolkitStack(account.account?.profile!, region);
    }
  }
}

async function deleteAppStack(accountName: string, profile: string, region: string) {
  const cfnClient = new CloudFormationClient({
    credentials: fromNodeProviderChain({ profile: profile }),
    region: region,
  });
  await cfnClient.send(new DeleteStackCommand({ StackName: `${accountName}-${region}-fruit-api` }));
  await waitUntilStackDeleteComplete({ client: cfnClient, maxWaitTime: 3600 }, { StackName: `${accountName}-${region}-fruit-api` })
}

async function deleteCdkToolkitStack(profile: string, region: string) {
  await deleteCdkToolkitStagingBucket(profile, region);
  await deleteCdkToolkitEcrRepo(profile, region);
  const cfnClient = new CloudFormationClient({
    credentials: fromNodeProviderChain({ profile: profile }),
    region: region,
  });
  await cfnClient.send(new DeleteStackCommand({ StackName: 'CDKToolkit' }));
  await waitUntilStackDeleteComplete({ client: cfnClient, maxWaitTime: 3600 }, { StackName: `CDKToolkit` })
}

async function deleteCdkToolkitEcrRepo(profile: string, region: string) {
  const cfnClient = new CloudFormationClient({
    credentials: fromNodeProviderChain({ profile: profile }),
    region: region,
  });
  try {
    const describeStackOutput = await cfnClient.send(new DescribeStacksCommand({ StackName: 'CDKToolkit' }));
    console.log(`${describeStackOutput.Stacks![0].StackName} stack found in ${profile} ${region}`);
    let ecrRepoName: string|undefined;
    if (describeStackOutput.Stacks![0].Outputs != undefined) {
      ecrRepoName = describeStackOutput.Stacks![0].Outputs.find(({ OutputKey }) => OutputKey === 'ImageRepositoryName')?.OutputValue;
      if (ecrRepoName != undefined) {
        await deleteEcrRepo(profile, region, ecrRepoName);
      }
    }
  } catch (error) {
    if (error instanceof CloudFormationServiceException) {
      console.log(`CDKToolkit stack not found in ${profile} ${region}`);

      return;
    }
  }
}

async function deleteEcrRepo(profile: string, region: string, ecrRepoName: string) {
  const ecrClient = new ECR({ credentials: fromNodeProviderChain({ profile: profile }), region: region });
  const listImagesOutput = await ecrClient.listImages({ repositoryName: ecrRepoName });
  if (listImagesOutput.imageIds!.length > 0) {
    // empty repo
    console.log(`Deleting ECR images for: ${ecrRepoName}`);
    await ecrClient.batchDeleteImage({ imageIds: listImagesOutput.imageIds!, repositoryName: ecrRepoName });
    // delete repo
    await ecrClient.deleteRepository({ repositoryName: ecrRepoName });
    console.log(`Deleted ECR repository: ${ecrRepoName}`);
  }
}

async function deleteCdkToolkitStagingBucket(profile: string, region: string) {
  const cfnClient = new CloudFormationClient({
    credentials: fromNodeProviderChain({ profile: profile }),
    region: region,
  });
  try {
    const describeStackOutput = await cfnClient.send(new DescribeStacksCommand({ StackName: 'CDKToolkit' }));
    console.log(`${describeStackOutput.Stacks![0].StackName} stack found in ${profile} ${region}`);
    let bucketName: string|undefined;
    if (describeStackOutput.Stacks![0].Outputs != undefined) {
      bucketName = describeStackOutput.Stacks![0].Outputs.find(({ OutputKey }) => OutputKey === 'BucketName')?.OutputValue;
      if (bucketName != undefined) {
        await deleteBucket(profile, region, bucketName);
      }
    }
  } catch (error) {
    if (error instanceof CloudFormationServiceException) {
      console.log(`CDKToolkit stack not found in ${profile} ${region}`);

      return;
    } else if (error instanceof NoSuchBucket) {
      console.log('NoSuchBucket, ignoring');

      return;
    } else {
      throw error;
    }
  }
}

async function deletePipelineBuckets(profile: string, region: string) {
  const s3Client = new S3Client({ credentials: fromNodeProviderChain({ profile: profile }), region: region });
  const listBucketsOutput = await s3Client.send(new ListBucketsCommand({}));
  const pipelineBuckets = listBucketsOutput.Buckets?.filter(bucket => bucket.Name?.startsWith('fruit-api-pipeline-'));
  if (pipelineBuckets != undefined) {
    for (let bucket of pipelineBuckets) {
      let bucketLocation = await searchBucketLocation(s3Client, bucket.Name!);
      try {
        if (bucketLocation != undefined) {
          // bucket has location constraint, set region
          await deleteBucket(profile, bucketLocation, bucket.Name!);
        } else {
          // bucket has no location constraint, use us-east-1
          await deleteBucket(profile, 'us-east-1', bucket.Name!);
        }
      } catch (error) {
        if (error instanceof NoSuchBucket) {
          console.log(`NoSuchBucket, ignoring: ${bucket.Name!}`);
          continue;
        } else {
          throw error;
        }
      }
    }
  }
}

async function searchBucketLocation(client: S3Client, bucket: string) {
  try {
    console.log(`Searching for Bucket location: ${bucket}`);
    const getBucketLocationOutput = await client.send(new GetBucketLocationCommand({ Bucket: bucket }))
      .catch(error => { throw new NoSuchBucket(error.message); });
    console.log(`Bucket found: ${bucket}`);

    return getBucketLocationOutput.LocationConstraint!;
  } catch (error) {
    if (error instanceof NoSuchBucket) {
      console.log(`NoSuchBucket, ignoring: ${bucket}`);

      return undefined;
    } else {
      throw error;
    }
  }
}

async function deleteBucket(profile: string, region: string, bucketName: string) {
  const s3Client = new S3Client({ credentials: fromNodeProviderChain({ profile: profile }), region: region });
  // delete objects
  const listObjectsOutput = await s3Client.send(new ListObjectsCommand({ Bucket: bucketName }));
  if (listObjectsOutput.Contents != undefined) {
    listObjectsOutput.Contents?.forEach(key => console.log(`Deleting object: ${key.Key}`));
    const objects = listObjectsOutput.Contents?.map(key => { return { Key: key.Key }; });
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: objects },
    }));
  }
  // delete object versions
  const listObjectVersionsOutput = await s3Client.send(new ListObjectVersionsCommand({ Bucket: bucketName }));
  if (listObjectVersionsOutput.Versions != undefined) {
    listObjectVersionsOutput.Versions?.forEach(version => console.log(`Deleting version: ${version.Key}, ${version.VersionId}`));
    const objectVersions = listObjectVersionsOutput.Versions?.map(version => { return { Key: version.Key, VersionId: version.VersionId }; });
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: objectVersions },
    }));
  }
  // delete markers
  if (listObjectVersionsOutput.DeleteMarkers != undefined) {
    listObjectVersionsOutput.DeleteMarkers?.forEach(marker => console.log(`Deleting marker: ${marker.Key}, ${marker.VersionId}`));
    const deleteMarkers = listObjectVersionsOutput.DeleteMarkers?.map(marker => { return { Key: marker.Key, VersionId: marker.VersionId }; });
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: deleteMarkers },
    }));
  }
  // delete bucket
  await s3Client.send(new DeleteBucketCommand({
    Bucket: bucketName,
  }));
  console.log(`Deleted bucket: ${bucketName}`);
}

async function promptAccount(message: string, initialProfile?: string): Promise<Account> {
  const profile = await promptProfile(message, initialProfile);
  const accountId = await getAccountId(profile);

  return {
    profile,
    accountId,
  };
}

async function promptProfile(message: string, initialProfile?: string): Promise<string> {
  const config = await loadSharedConfigFiles();
  const profiles = Object.keys(config.configFile).sort();
  let initial = initialProfile?profiles.indexOf(initialProfile):undefined;
  if (initial === -1) { initial = undefined; }
  const profile = await prompts.select({
    type: 'select',
    name: 'profile',
    message,
    initial,
    choices: profiles.map(k => ({ title: k, value: k })),
  }) as unknown as string;

  return profile;
}

async function getAccountId(profile: string): Promise<string> {
  const client = new STS({
    credentials: fromNodeProviderChain({ profile }),
  });

  return (await client.getCallerIdentity({})).Account!;
}

async function getRegion(profile: string): Promise<string> {
  const client = new STS({
    credentials: fromNodeProviderChain({ profile }),
  });

  return client.config.region();
}

main().catch(console.error);
