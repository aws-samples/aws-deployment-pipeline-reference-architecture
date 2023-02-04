import path from 'path';
import { Duration } from 'aws-cdk-lib';
import { IStage } from 'aws-cdk-lib/aws-codepipeline';
import { LambdaInvokeAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { CodePipelineActionFactoryResult, CodePipelineSource, ICodePipelineActionFactory, ProduceActionOptions, Step } from 'aws-cdk-lib/pipelines';

export enum CodeGuruReviewRecommendationCategory {
  AWS_BEST_PRACTICES = 'AWSBestPractices',
  AWS_CLOUDFORMATION_ISSUES = 'AWSCloudFormationIssues',
  CODE_INCONSISTENCIES = 'CodeInconsistencies',
  CODE_MAINTENANCE_ISSUES = 'CodeMaintenanceIssues',
  CONCURRENCY_ISSUES = 'ConcurrencyIssues',
  DUPLICATE_CODE = 'DuplicateCode',
  INPUT_VALIDATIONS = 'InputValidations',
  JAVA_BEST_PRACTICES = 'JavaBestPractices',
  PYTHON_BEST_PRACTICES = 'PythonBestPractices',
  RESOURCE_LEAKS = 'ResourceLeaks',
  SECURITY_ISSUES = 'SecurityIssues',
}

export class CodeGuruReviewFilter {

  static defaultCodeSecurityFilter(): CodeGuruReviewFilter {
    return {
      recommendationCategories: [
        CodeGuruReviewRecommendationCategory.SECURITY_ISSUES,
      ],
      maxSuppressedLinesOfCodeCount: 0,
      maxCriticalRecommendations: 0,
      maxHighRecommendations: 0,
      maxInfoRecommendations: 0,
      maxMediumRecommendations: 0,
      maxLowRecommendations: 0,
    };
  }
  static defaultCodeQualityFilter(): CodeGuruReviewFilter {
    return {
      recommendationCategories: [
        CodeGuruReviewRecommendationCategory.AWS_BEST_PRACTICES,
        CodeGuruReviewRecommendationCategory.CODE_INCONSISTENCIES,
        CodeGuruReviewRecommendationCategory.CODE_MAINTENANCE_ISSUES,
        CodeGuruReviewRecommendationCategory.DUPLICATE_CODE,
        CodeGuruReviewRecommendationCategory.INPUT_VALIDATIONS,
        CodeGuruReviewRecommendationCategory.CONCURRENCY_ISSUES,
        CodeGuruReviewRecommendationCategory.RESOURCE_LEAKS,
        CodeGuruReviewRecommendationCategory.JAVA_BEST_PRACTICES,
        CodeGuruReviewRecommendationCategory.PYTHON_BEST_PRACTICES,
      ],
      maxSuppressedLinesOfCodeCount: 0,
      maxCriticalRecommendations: 0,
      maxHighRecommendations: 0,
      maxInfoRecommendations: 0,
      maxMediumRecommendations: 0,
      maxLowRecommendations: 0,
    };
  }
  recommendationCategories!: CodeGuruReviewRecommendationCategory[];
  maxSuppressedLinesOfCodeCount?: number;
  maxCriticalRecommendations?: number;
  maxHighRecommendations?: number;
  maxInfoRecommendations?: number;
  maxMediumRecommendations?: number;
  maxLowRecommendations?: number;
}

export class CodeGuruReviewCheckProps {
  source!: CodePipelineSource;
  filter?: CodeGuruReviewFilter;
  reviewRequired?: boolean; // default: true
}

export class CodeGuruReviewCheck extends Step implements ICodePipelineActionFactory {
  static readonly SourceParameters = ['RepositoryName', 'CommitId'];
  private userParameters: Record<string, string>;

  constructor(id: string, private readonly props: CodeGuruReviewCheckProps) {
    super(id);
    this.userParameters = CodeGuruReviewCheck.SourceParameters.reduce((params, name) => {
      params[name] = props.source.sourceAttribute(name);

      return params;
    }, {} as Record<string, string>);

    if (props.filter) {
      const capitalize = (s:string) => s.replace(/^./, c => c.toUpperCase());
      for (let [key, val] of Object.entries(props.filter)) {
        this.userParameters[capitalize(key)] = val.toString();
      }
    }
    this.userParameters.ReviewRequired = (props.reviewRequired !== false).toString();
    this.discoverReferencedOutputs(this.userParameters);
  }

  public produceAction(stage: IStage, options: ProduceActionOptions): CodePipelineActionFactoryResult {
    const codeGuruLambda = new NodejsFunction(stage.pipeline, `${this.id}CodeGuruLambda`, {
      timeout: Duration.seconds(60),
      runtime: Runtime.NODEJS_18_X,
      handler: 'main',
      entry: path.join(__dirname, 'lambda/index.ts'),
    });
    codeGuruLambda.addToRolePolicy(new PolicyStatement({
      actions: [
        'codeguru-reviewer:ListCodeReviews',
        'codeguru-reviewer:ListRecommendations',
      ],
      resources: ['*'],
    }));

    stage.addAction(new LambdaInvokeAction({
      actionName: this.id,
      runOrder: options.runOrder,
      inputs: [options.artifacts.toCodePipeline(this.props.source.primaryOutput!)],
      lambda: codeGuruLambda,
      userParameters: this.userParameters,
    }));


    return { runOrdersConsumed: 1 };
  }
}

