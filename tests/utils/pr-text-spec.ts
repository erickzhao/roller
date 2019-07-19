import { getPRText } from '../../src/utils/pr-text';
import { ROLL_TARGETS } from '../../src/constants';

jest.mock('../../src/utils/octokit');

describe('getPRText()', () => {
  describe('Node.js target', () => {
    it('returns a Node.js PR body', () => {
      const target = ROLL_TARGETS.NODE;
      const details = {
        newVersion: 'v10.0.0',
        previousVersion: 'v4.0.0',
        branchName: 'master'
      };
      const prText = getPRText(target, details);
  
      // correct title
      expect(prText.title)
        .toBe(`chore: bump ${ROLL_TARGETS.NODE.name} to ${details.newVersion} (${details.branchName})`);
      
      // contains short description
      expect(prText.body)
        .toContain(`Updating Node.js to ${details.newVersion}.`);
      // contains original node version reference
      expect(prText.body)
        .toContain(`Original-Node-Version: ${details.previousVersion}`);
      // contains release notes
      expect(prText.body)
        .toContain(`Notes: Updated Node.js to ${details.newVersion}`);
      // contains link to diff
      expect(prText.body)
        .toContain(`https://github.com/nodejs/node/compare/${details.previousVersion}...${details.newVersion}`);
    });
  });
  describe('Chromium target', () => {
    it('returns a Chromium PR body', () => {
      const target = ROLL_TARGETS.CHROMIUM;
      const details = {
        newVersion: '1.0.154.65',
        previousVersion: '1.0.154.61',
        branchName: 'testBranch'
      };

      const prText = getPRText(target, details);

      // correct title
      expect(prText.title)
        .toContain(`chore: bump ${ROLL_TARGETS.CHROMIUM.name}`);
      
      // contains short description
      expect(prText.body)
        .toContain(`Updating Chromium`);
      // contains original chromium version reference
      expect(prText.body)
        .toContain(`Original-Chromium-Version: ${details.previousVersion}`);
      // contains link to diff
      expect(prText.body)
        .toContain(`https://chromium.googlesource.com/chromium/src/+/${details.previousVersion}..${details.newVersion}`);
    });

    it('assumes LKGR if version is a commit SHA', () => {
      const target = ROLL_TARGETS.CHROMIUM;
      const details = {
        newVersion: '9F86D081884C7D659A2FEAA0C55',
        previousVersion: 'AD015A3BF4F1B2B0B822CD15D6C15B0F00A08',
        branchName: 'testBranch'
      };

      const prText = getPRText(target, details);

      expect(prText.body).toContain('(lkgr)');
      expect(prText.body).toContain('no-notes');
    });

    it('adds version to release notes if version is release tag', () => {
      const target = ROLL_TARGETS.CHROMIUM;
      const details = {
        newVersion: '1.0.154.65',
        previousVersion: '1.0.154.61',
        branchName: 'testBranch'
      };

      const prText = getPRText(target, details);
      expect(prText.body).toContain(`Updated Chromium to ${details.newVersion}.`);
    });
  })
});