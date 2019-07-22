import { roll } from '../../src/utils/roll';
import { getOctokit } from '../../src/utils/octokit';
import { ROLL_TARGETS, PR_USER, REPOS } from '../../src/constants';
import { updateDepsFile } from '../../src/utils/update-deps';

jest.mock('../../src/utils/octokit');
jest.mock('../../src/utils/update-deps');

describe('roll()', () => {
  const branch = {
    name: 'testBranch',
    commit: {
      sha: 'asdsad',
      url: 'asdsadsad'
    },
    protected: true,
    protection: {
      enabled: false,
      required_status_checks: {
        enforcement_level: '',
        contexts: []
      }
    },
    protection_url: 'asdasd'
  };

  beforeEach(() => {
    this.mockOctokit = {
      paginate: jest.fn(),
      pulls: {
        update: jest.fn(),
        create: jest.fn().mockReturnValue({data: {html_url: 'https://google.com'}})
      },
      git: {
        createRef: jest.fn()
      }
    };
    (getOctokit as jest.Mock).mockReturnValue(this.mockOctokit);
    (updateDepsFile as jest.Mock).mockReturnValue('v4.0.0');
  });
  
  it('takes no action if versions are identical', async () => {
    this.mockOctokit.paginate.mockReturnValue(
      [{
        user: {
          login: PR_USER
        },
        title: ROLL_TARGETS.NODE.name,
        number: 1,
        head: {
          ref: 'asd'
        },
        body: 'Original-Node-Version: v4.0.0'
      }]
    );

    await roll({
      rollTarget: ROLL_TARGETS.NODE,
      electronBranch: branch,
      newVersion: 'v4.0.0'
    });

    expect(this.mockOctokit.pulls.update).not.toHaveBeenCalled();
    expect(this.mockOctokit.pulls.create).not.toHaveBeenCalled();
  });

  it('updates a PR if existing PR already exists', async () => {
    this.mockOctokit.paginate.mockReturnValue(
      [{
        user: {
          login: PR_USER
        },
        title: ROLL_TARGETS.NODE.name,
        number: 1,
        head: {
          ref: 'asd'
        },
        body: 'Original-Node-Version: v4.0.0'
      }]
    );

    await roll({
      rollTarget: ROLL_TARGETS.NODE,
      electronBranch: branch,
      newVersion: 'v10.0.0'
    });

    expect(this.mockOctokit.pulls.update).toHaveBeenCalledWith(expect.objectContaining({
      owner: REPOS.ELECTRON.OWNER,
      repo: REPOS.ELECTRON.NAME,
      pull_number: 1
    }));
  })

  it('creates a new PR if none found', async () => {
    this.mockOctokit.paginate.mockReturnValue([]);

    await roll({
      rollTarget: ROLL_TARGETS.NODE,
      electronBranch: branch,
      newVersion: 'v10.0.0'
    });

    const newBranchName = `roller/${ROLL_TARGETS.NODE.name}/${branch.name}`;

    expect(this.mockOctokit.git.createRef).toHaveBeenCalledWith({
      owner: REPOS.ELECTRON.OWNER,
      repo: REPOS.ELECTRON.NAME,
      ref: `refs/heads/${newBranchName}`,
      sha: branch.commit.sha
    })

    expect(this.mockOctokit.pulls.create).toHaveBeenCalledWith(expect.objectContaining({
      owner: REPOS.ELECTRON.OWNER,
      repo: REPOS.ELECTRON.NAME,
      base: branch.name,
      head: `${REPOS.ELECTRON.OWNER}:${newBranchName}`
    }));
  })
});