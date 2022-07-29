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
      RecommendationCategories: [
        CodeGuruReviewRecommendationCategory.SECURITY_ISSUES,
      ],
      MaxSuppressedLinesOfCodeCount: 0,
      MaxCriticalRecommendations: 0,
      MaxHighRecommendations: 0,
      MaxInfoRecommendations: 0,
      MaxMediumRecommendations: 0,
      MaxLowRecommendations: 0,
    };
  }
  static defaultCodeQualityFilter(): CodeGuruReviewFilter {
    return {
      RecommendationCategories: [
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
      MaxSuppressedLinesOfCodeCount: 0,
      MaxCriticalRecommendations: 0,
      MaxHighRecommendations: 0,
      MaxInfoRecommendations: 0,
      MaxMediumRecommendations: 0,
      MaxLowRecommendations: 0,
    };
  }
  RecommendationCategories!: CodeGuruReviewRecommendationCategory[];
  MaxSuppressedLinesOfCodeCount?: number;
  MaxCriticalRecommendations?: number;
  MaxHighRecommendations?: number;
  MaxInfoRecommendations?: number;
  MaxMediumRecommendations?: number;
  MaxLowRecommendations?: number;
}

export class CodeGuruReviewCheckProps {
  Source!: CodePipelineSource;
  Filter?: CodeGuruReviewFilter;
  ReviewRequired?: boolean; // default: true
}

export class CodeGuruReviewCheck extends Step implements ICodePipelineActionFactory {
  static readonly SourceParameters = ['RepositoryName', 'CommitId'];
  private userParameters: Record<string, string>;

  constructor(id: string, private readonly props: CodeGuruReviewCheckProps) {
    super(id);
    this.userParameters = CodeGuruReviewCheck.SourceParameters.reduce((params, name) => {
      params[name] = props.Source.sourceAttribute(name);
      return params;
    }, {} as Record<string, string>);

    if (props.Filter) {
      for (let [key, val] of Object.entries(props.Filter)) {
        this.userParameters[key] = val.toString();
      }
    }
    this.userParameters.ReviewRequired = (props.ReviewRequired !== false).toString();
    this.discoverReferencedOutputs(this.userParameters);
  }

  public produceAction(stage: IStage, options: ProduceActionOptions): CodePipelineActionFactoryResult {
    const codeGuruLambda = new NodejsFunction(stage.pipeline, `${this.id}CodeGuruLambda`, {
      timeout: Duration.seconds(60),
      runtime: Runtime.NODEJS_16_X,
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
      inputs: [options.artifacts.toCodePipeline(this.props.Source.primaryOutput!)],
      lambda: codeGuruLambda,
      userParameters: this.userParameters,
    }));


    return { runOrdersConsumed: 1 };
  }
}

