import { ROLL_TARGETS, RollTarget } from '../constants';

interface PRTextDetails {
  previousVersion: string;
  newVersion: string;
  branchName: string;
}

export function getPRText(rollTarget: RollTarget, details: PRTextDetails) {
  switch (rollTarget.name) {
    case ROLL_TARGETS.NODE.name:
      return getNodePRText(details);
    case ROLL_TARGETS.CHROMIUM.name:
      return getChromiumPRText(details);
  }
}

function getChromiumPRText(details: PRTextDetails) {
  const { newVersion, previousVersion, branchName } = details;

  const isLKGR = !newVersion.includes('.');
  const shortVersion = isLKGR ? newVersion.substr(11) : newVersion;
  const shortPreviousVersion = isLKGR ? previousVersion.substr(11) : previousVersion;
  const diffLink = `https://chromium.googlesource.com/chromium/src/+/${previousVersion}..${newVersion}`;
  return {
    title: `chore: bump ${ROLL_TARGETS.CHROMIUM.name} to ${shortVersion} (${branchName})`,
    body: `Updating Chromium to ${shortVersion}${isLKGR ? ' (lkgr)' : ''}.

See [all changes in ${shortPreviousVersion}..${shortVersion}](${diffLink})

<!--
Original-Chromium-Version: ${previousVersion}
-->

Notes: ${isLKGR ? 'no-notes' : `Updated Chromium to ${newVersion}.`}`,
  };
}

function getNodePRText(details: PRTextDetails) {
  const { newVersion, previousVersion, branchName } = details;

  const diffLink = `https://github.com/nodejs/node/compare/${previousVersion}...${newVersion}`;
  return {
    title: `chore: bump ${ROLL_TARGETS.NODE.name} to ${newVersion} (${branchName})`,
    body: `Updating Node.js to ${newVersion}.

See [all changes in ${previousVersion}..${newVersion}](${diffLink})

<!--
Original-Node-Version: ${previousVersion}
-->

Notes: Updated Node.js to ${newVersion}.`};
}