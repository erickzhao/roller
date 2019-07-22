import { PullsListResponseItem, ReposListBranchesResponseItem } from '@octokit/rest';
import * as debug from 'debug';

import { PR_USER , REPOS, RollTarget } from '../constants';
import { getOctokit } from './octokit';
import { getPRText } from './pr-text';
import { updateDepsFile } from './update-deps';

interface RollParams {
  rollTarget: RollTarget;
  electronBranch: ReposListBranchesResponseItem;
  newVersion: string;
}

export async function roll(params: RollParams): Promise<void> {
  const { rollTarget, electronBranch, newVersion } = params;
  const d = debug(`roller/${rollTarget.name}:roll()`);
  const github = await getOctokit();

  d(`roll triggered for electron branch=${electronBranch.name} ${rollTarget.key}=${newVersion}`);

  // Look for a pre-existing PR that targets this branch to see if we can update that.
  const existingPrsForBranch =
    await github.paginate('GET /repos/:owner/:repo/pulls', {
      base: electronBranch.name,
      owner: REPOS.ELECTRON.OWNER,
      repo: REPOS.ELECTRON.NAME,
      state: 'open',
    }) as PullsListResponseItem[];

  const myPrs = existingPrsForBranch
    .filter((pr) => pr.user.login === PR_USER && pr.title.includes(rollTarget.name));

  if (myPrs.length) {
    // Update the existing PR (s?)
    for (const pr of myPrs) {
      d(`found existing PR: #${pr.number}, attempting DEPS update`);
      const previousDEPSVersion = await updateDepsFile({
        depName: rollTarget.name,
        depKey: rollTarget.key,
        branch: pr.head.ref,
        newVersion,
      });

      if (previousDEPSVersion === newVersion) {
        d(`version unchanged, skipping PR body update`);
        continue;
      }

      d(`version changed, updating PR body`);
      const targetName = rollTarget.name.charAt(0).toUpperCase() + rollTarget.name.slice(1);
      const originalVersionRegex = new RegExp(`^Original-${targetName}-Version: (\\S+)`, 'm');
      const captured = originalVersionRegex.exec(pr.body);
      const [, previousPRVersion] = captured;

      await github.pulls.update({
        owner: REPOS.ELECTRON.OWNER,
        repo: REPOS.ELECTRON.NAME,
        pull_number: pr.number,
        ...getPRText(rollTarget, {
          previousVersion: previousPRVersion,
          newVersion,
          branchName: electronBranch.name,
        }),
      });
    }
  } else {
    d(`no existing PR found, raising a new PR`);
    // Create a new ref that the PR will point to
    const electronSha = electronBranch.commit.sha;
    const branchName = `roller/${rollTarget.name}/${electronBranch.name}`;
    const newRef = `refs/heads/${branchName}`;

    d(`creating ref=${newRef} at sha=${electronSha}`);

    await github.git.createRef({
      owner: REPOS.ELECTRON.OWNER,
      repo: REPOS.ELECTRON.NAME,
      ref: newRef,
      sha: electronSha,
    });

    // Update the ref
    d(`updating the new ref with version=${newVersion}`);
    const previousNodeVersion = await updateDepsFile({
      depName: rollTarget.name,
      depKey: rollTarget.key,
      branch: branchName,
      newVersion,
    });

    // Raise a PR
    d(`raising a PR for ${branchName} to ${electronBranch.name}`);
    const newPr = await github.pulls.create({
      owner: REPOS.ELECTRON.OWNER,
      repo: REPOS.ELECTRON.NAME,
      base: electronBranch.name,
      head: `${REPOS.ELECTRON.OWNER}:${branchName}`,
      ...getPRText(rollTarget, {
        previousVersion: previousNodeVersion,
        newVersion,
        branchName: electronBranch.name,
      }),
    });
    d(`new PR: ${newPr.data.html_url}`);
    // TODO: add comment with commit list to new PR.
  }
}