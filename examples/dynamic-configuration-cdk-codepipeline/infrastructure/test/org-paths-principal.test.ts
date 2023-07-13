import { OrgPathsPrincipal } from '../src/security/org-paths-principal';

test('verify toString works as expected', () => {
  const orgPrincipal = new OrgPathsPrincipal(['o-abc123/r-cde456/ou-efg789/ou-abcdef-g']);
  expect(orgPrincipal.toString()).toBe(
    'OrgPathsPrincipal(o-abc123/r-cde456/ou-efg789/ou-abcdef-g)',
  );
});

test('verify dedupeString works as expected', () => {
  const orgPrincipal = new OrgPathsPrincipal(['o-abc123/r-cde456/ou-efg789/ou-abcdef-g']);
  expect(orgPrincipal.dedupeString()).toBe(
    'OrgPathsPrincipal(o-abc123/r-cde456/ou-efg789/ou-abcdef-g)',
  );
});
