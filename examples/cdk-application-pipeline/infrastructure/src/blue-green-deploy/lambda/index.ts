import { CodeDeploy, DeploymentStatus, GetDeploymentOutput } from '@aws-sdk/client-codedeploy';
import { stringify } from 'yaml';

const codedeployClient = new CodeDeploy({});

export interface DeploymentProperties {
  applicationName: string;
  deploymentConfigName: string;
  deploymentGroupName: string;
  taskDefinitionArn: string;
  containerName: string;
  containerPort: number;
}

export interface DataAttributes {
  deploymentId: string;
}
export interface OnEvent {
  RequestType: string;
  LogicalResourceId: string;
  PhysicalResourceId: string;
  ResourceProperties: DeploymentProperties;
  OldResourceProperties: DeploymentProperties;
  ResourceType: string;
  RequestId: string;
  StackId: string;
}
export interface OnEventResponse {
  PhysicalResourceId?: string;
  Data?: DataAttributes;
  NoEcho?: boolean;
}
export async function onEvent(event: OnEvent): Promise<OnEventResponse> {
  switch (event.RequestType) {
    case 'Create':
    case 'Update': {
      // create deployment
      const props = event.ResourceProperties;
      const resp = await codedeployClient.createDeployment({
        applicationName: props.applicationName,
        autoRollbackConfiguration: {
          enabled: true,
          events: ['DEPLOYMENT_FAILURE', 'DEPLOYMENT_STOP_ON_ALARM'],
        },
        deploymentConfigName: props.deploymentConfigName,
        deploymentGroupName: props.deploymentGroupName,
        revision: {
          revisionType: 'AppSpecContent',
          appSpecContent: {
            content: formatAppSpecContent(props),
          },
        },
      });
      console.log(`${event.RequestType}: new deploymentId '${resp.deploymentId}'`);
      return {
        PhysicalResourceId: resp.deploymentId!,
        Data: {
          deploymentId: resp.deploymentId!,
        },
      };
    }
    case 'Delete':
      // cancel deployment and rollback
      try {
        const resp = await codedeployClient.stopDeployment({
          deploymentId: event.PhysicalResourceId,
          autoRollbackEnabled: true,
        });
        console.log(`${event.RequestType}: stopped deploymentId '${event.PhysicalResourceId}': ${resp.status} ${resp.statusMessage}`);
      } catch (e) {
        console.log(`Delete: Ignoring eror ${e}`);
      }
      return {};
    default:
      throw new Error(`Unknown request type: ${event.RequestType}`);
  }
}

function formatAppSpecContent(props: DeploymentProperties): string {
  const appSpec = {
    version: '0.0',
    Resources: [{
      TargetService: {
        Type: 'AWS::ECS::Service',
        Properties: {
          TaskDefinition: props.taskDefinitionArn,
          LoadBalancerInfo: {
            ContainerName: props.containerName,
            ContainerPort: props.containerPort,
          },
          PlatformVersion: 'LATEST',
        },
      },
    }],
  };
  return stringify(appSpec);
}

export interface IsComplete {
  RequestType: string;
  LogicalResourceId: string;
  PhysicalResourceId: string;
  ResourceProperties: any;
  OldResourceProperties: any;
  ResourceType: string;
  RequestId: string;
  StackId: string;
}
export interface IsCompleteResponse {
  IsComplete: boolean;
  Data?: any;
}

export async function isComplete(event: IsComplete): Promise<IsCompleteResponse> {
  try {
    const resp = await codedeployClient.getDeployment({ deploymentId: event.PhysicalResourceId });
    let rollbackResp: GetDeploymentOutput = {};
    if (resp.deploymentInfo?.rollbackInfo?.rollbackDeploymentId) {
      rollbackResp = await codedeployClient.getDeployment({ deploymentId: resp.deploymentInfo?.rollbackInfo?.rollbackDeploymentId });
    }
    console.log(`${event.RequestType}: deploymentId='${event.PhysicalResourceId}' status=${resp.deploymentInfo?.status} rollbackStatus=${rollbackResp?.deploymentInfo?.status}`);

    // check if deployment id is complete
    switch (event.RequestType) {
      case 'Create':
      case 'Update':
        switch (resp.deploymentInfo?.status) {
          case DeploymentStatus.SUCCEEDED:
            console.log('COMPLETE: deployment finished successfully');
            return { IsComplete: true };
          case DeploymentStatus.FAILED:
          case DeploymentStatus.STOPPED:
            if (rollbackResp.deploymentInfo?.status) {
              if (rollbackResp.deploymentInfo?.status == DeploymentStatus.SUCCEEDED ||
                rollbackResp.deploymentInfo?.status == DeploymentStatus.FAILED ||
                rollbackResp.deploymentInfo?.status == DeploymentStatus.STOPPED) {
                console.log('COMPLETE: deployment failed');
                const errInfo = resp.deploymentInfo.errorInformation;
                throw new Error(`Deployment ${resp.deploymentInfo.status}: [${errInfo?.code}] ${errInfo?.message}`);
              }
              console.log('INCOMPLETE: waiting for final status from a rollback');
              return { IsComplete: false }; // waiting for final status from rollback
            } else {
              console.log('COMPLETE: no rollback to wait for');
              const errInfo = resp.deploymentInfo.errorInformation;
              throw new Error(`Deployment ${resp.deploymentInfo.status}: [${errInfo?.code}] ${errInfo?.message}`);
            }
          default:
            console.log('INCOMPLETE: waiting for final status from deployment');
            return { IsComplete: false };
        }
      case 'Delete':
        switch (resp.deploymentInfo?.status) {
          case DeploymentStatus.SUCCEEDED:
            console.log('COMPLETE: deployment finished successfully - nothing to delete');
            return { IsComplete: true };
          case DeploymentStatus.FAILED:
          case DeploymentStatus.STOPPED:
            if (rollbackResp.deploymentInfo?.status) {
              if (rollbackResp.deploymentInfo?.status == DeploymentStatus.SUCCEEDED ||
                rollbackResp.deploymentInfo?.status == DeploymentStatus.FAILED ||
                rollbackResp.deploymentInfo?.status == DeploymentStatus.STOPPED) {
                console.log('COMPLETE: rollback in final status');
                return { IsComplete: true }; // rollback finished, we're deleted
              }
              console.log('INCOMPLETE: waiting for final status from a rollback');
              return { IsComplete: false }; // waiting for rollback
            }
            console.log('COMPLETE: no rollback to wait for');
            return { IsComplete: true };
          default:
            console.log('INCOMPLETE: waiting for final status from deployment');
            return { IsComplete: false };
        }
      default:
        throw new Error(`Unknown request type: ${event.RequestType}`);
    }
  } catch (e) {
    if (event.RequestType === 'Delete') {
      console.error(e);
      console.log('COMPLETE: ignoring error - nothing to do');
      return { IsComplete: true };
    }
    throw e;
  }
}