import { CodeGuruReviewerClient, JobState, Type, paginateListCodeReviews, paginateListRecommendations, CodeReviewSummary, Severity, RecommendationCategory } from '@aws-sdk/client-codeguru-reviewer';
import { CodePipeline, FailureType } from '@aws-sdk/client-codepipeline';
import { CodePipelineEvent } from 'aws-lambda';

const codepipeline = new CodePipeline({});
const codeguruClient = new CodeGuruReviewerClient({});

export async function main(event: CodePipelineEvent) {
  const jobId = event['CodePipeline.job'].id;
  const params = JSON.parse(
    event['CodePipeline.job'].data.actionConfiguration.configuration.UserParameters,
  ) as unknown as CodeGuruReviewCheckProperties;
  try {
    const summary = await checkCodeGuruReview(params);
    console.log(summary);
    await codepipeline.putJobSuccessResult({
      jobId,
      executionDetails: {
        summary,
      },
    });
  } catch (e) {
    console.error(e);
    let message = 'Unknown Error';
    if (e instanceof Error) message = e.message;
    await codepipeline.putJobFailureResult({
      jobId,
      failureDetails: {
        type: FailureType.JobFailed,
        message,
      },
    });
  }

}

class CodeGuruReviewCheckProperties {
  readonly RepositoryName!: string;
  readonly CommitId!: string;
  readonly RecommendationCategories!: string;
  readonly MaxSuppressedLinesOfCodeCount?: number;
  readonly MaxCriticalRecommendations?: number;
  readonly MaxHighRecommendations?: number;
  readonly MaxInfoRecommendations?: number;
  readonly MaxMediumRecommendations?: number;
  readonly MaxLowRecommendations?: number;
  readonly ReviewRequired?: boolean;
}

async function checkCodeGuruReview(props: CodeGuruReviewCheckProperties): Promise<string> {
  const reviewSummary = await findCodeGuruReview(props);
  if (!reviewSummary) {
    if (props.ReviewRequired === false || props.ReviewRequired?.toString() === 'false') {
      return 'No CodeGuru Review exists for this commit.';
    }
    throw new Error('Unable to find a CodeGuru Review for this commit');
  }

  const reviewUrl = `https://${reviewSummary.CodeReviewArn?.split(':')[3]}.console.aws.amazon.com/codeguru/reviewer/codereviews/details/${reviewSummary.CodeReviewArn}`;

  if (reviewSummary.MetricsSummary?.SuppressedLinesOfCodeCount && props.MaxSuppressedLinesOfCodeCount) {
    if (reviewSummary.MetricsSummary?.SuppressedLinesOfCodeCount > props.MaxSuppressedLinesOfCodeCount) {
      throw new Error(`Too many lines suppressed in the CodeGuru Review (${reviewSummary.MetricsSummary?.SuppressedLinesOfCodeCount}): ${reviewUrl}`);
    }
  }

  if (reviewSummary.MetricsSummary?.FindingsCount! > 0) {
    const paginator = paginateListRecommendations({ client: codeguruClient }, {
      CodeReviewArn: reviewSummary.CodeReviewArn,
    });
    const severityCounts = new Map<Severity, number>();
    for await (const page of paginator) {
      if (page.RecommendationSummaries) {
        for (const summary of page.RecommendationSummaries) {
          if (props.RecommendationCategories.split(/\s*,\s*/).includes(summary.RecommendationCategory! as RecommendationCategory)) {
            const severity = summary.Severity as Severity;
            severityCounts.set(severity, (severityCounts.has(severity) ? severityCounts.get(severity)! : 0) + 1);
          }
        }
      }
    }

    const assertSeverityCount = (severity: Severity, maxCount: number | undefined) => {
      if (maxCount !== undefined && severityCounts.has(severity) && severityCounts.get(severity)! > maxCount!) {
        throw new Error(`Too many ${severity} recomendations (${severityCounts.get(severity)}): ${reviewUrl}`);
      }
    };

    assertSeverityCount(Severity.CRITICAL, props.MaxCriticalRecommendations);
    assertSeverityCount(Severity.HIGH, props.MaxHighRecommendations);
    assertSeverityCount(Severity.MEDIUM, props.MaxMediumRecommendations);
    assertSeverityCount(Severity.INFO, props.MaxInfoRecommendations);
    assertSeverityCount(Severity.LOW, props.MaxLowRecommendations);
  }

  return `CodeGuru Review accepted: ${reviewUrl}`;
}

async function findCodeGuruReview(props: CodeGuruReviewCheckProperties): Promise<CodeReviewSummary | undefined> {
  const paginator = paginateListCodeReviews({ client: codeguruClient }, {
    Type: Type.PULL_REQUEST,
    RepositoryNames: [props.RepositoryName],
    States: [JobState.COMPLETED],
  });
  for await (const page of paginator) {
    const summary = page.CodeReviewSummaries?.find(s =>
      s.SourceCodeType?.CommitDiff?.SourceCommit === props.CommitId,
    );
    if (summary) {
      return summary!;
    }
  }

  return;
}