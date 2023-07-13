import { PrincipalBase, PrincipalPolicyFragment } from 'aws-cdk-lib/aws-iam';

export class OrgPathsPrincipal extends PrincipalBase {
  constructor(private principalOrgPaths: string[]) {
    super();
  }
  get policyFragment() {
    return new PrincipalPolicyFragment(
      {
        // This is set to '*' because the actual filtering happens in the Org Path
        AWS: ['*'],
      },
      {
        'ForAnyValue:StringLike': {
          'aws:PrincipalOrgPaths': this.principalOrgPaths,
        },
      },
    );
  }
  toString() {
    return `OrgPathsPrincipal(${this.principalOrgPaths})`;
  }
  dedupeString() {
    return `OrgPathsPrincipal(${this.principalOrgPaths})`;
  }
}