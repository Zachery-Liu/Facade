import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const unpublishedActionReference = 'Zachery-Liu/Facade@e6d5dcfb5ae901841a7798e03abd7d63c6103fd8';
const standaloneConcurrencyGroup = "facade-pages-${{ github.repository }}-${{ github.event_name == 'push' && github.ref_name != github.event.repository.default_branch && github.run_id || 'site' }}";
const defaultBranchCondition = "github.event_name != 'push' || github.ref_name == github.event.repository.default_branch";

const StepSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  run: z.string().optional(),
  uses: z.string().optional(),
  with: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const JobSchema = z.object({
  environment: z.union([z.string(), z.object({ name: z.string(), url: z.string().optional() })]).optional(),
  if: z.string().optional(),
  needs: z.union([z.string(), z.array(z.string())]).optional(),
  permissions: z.record(z.string(), z.string()).optional(),
  steps: z.array(StepSchema),
}).passthrough();

const WorkflowSchema = z.object({
  concurrency: z.object({ group: z.string(), 'cancel-in-progress': z.boolean() }),
  jobs: z.record(z.string(), JobSchema),
  on: z.record(z.string(), z.unknown()),
}).passthrough();

type Workflow = z.infer<typeof WorkflowSchema>;
type Job = z.infer<typeof JobSchema>;

describe('Pages workflow templates', () => {
  it.each([
    ['facade-pages-release.yml', 'build'],
    ['facade-pages-after-release.yml', 'facade'],
  ] as const)('validates %s at the exact Pages contract paths', async (name, buildJobName) => {
    const workflow = await readWorkflow(join('examples', 'workflows', name));
    expect(workflow.concurrency).toEqual({
      group: buildJobName === 'build' ? standaloneConcurrencyGroup : 'facade-pages-${{ github.repository }}-site',
      'cancel-in-progress': true,
    });

    const build = requireJob(workflow, buildJobName);
    expect(build.permissions).toEqual({ contents: 'read', pages: 'read' });
    expect(build.steps.map((step) => step.uses)).toEqual([
      'actions/checkout@v7',
      'actions/configure-pages@v6',
      unpublishedActionReference,
      'actions/upload-pages-artifact@v5',
    ]);
    expect(requireStep(build, 'actions/checkout@v7').with).toEqual({ ref: '${{ github.event.repository.default_branch }}' });
    expect(requireStep(build, unpublishedActionReference).with).toEqual({
      config: '.github/facade.yml',
      'base-path': "${{ steps.pages.outputs.base_path || '/' }}",
      'out-dir': '.facade-dist',
      token: '${{ github.token }}',
    });
    expect(requireStep(build, 'actions/upload-pages-artifact@v5').with).toEqual({ path: '${{ steps.facade.outputs.output-path }}' });

    const deploy = requireJob(workflow, 'deploy');
    expect(deploy.needs).toBe(buildJobName);
    expect(deploy).not.toHaveProperty('concurrency');
    expect(deploy.permissions).toEqual({ actions: 'read', contents: 'read', pages: 'write', 'id-token': 'write' });
    expect(deploy.environment).toEqual({ name: 'github-pages', url: '${{ steps.deployment.outputs.page_url }}' });
    expect(deploy.steps.map((step) => ({ id: step.id, uses: step.uses }))).toEqual([
      { id: 'deployment', uses: 'actions/deploy-pages@v5' },
    ]);
  });

  it('excludes tag pushes, gates config pushes on the actual default branch, and documents asset completeness', async () => {
    const source = await readFile(join(repositoryRoot, 'examples/workflows/facade-pages-release.yml'), 'utf8');
    const standalone = parseWorkflow(source);
    const triggers = z.object({
      release: z.object({ types: z.array(z.string()) }),
      workflow_dispatch: z.null(),
      push: z.object({ paths: z.array(z.string()) }).passthrough(),
    }).parse(standalone.on);
    expect(triggers.release.types).toEqual(['published']);
    expect(triggers.push.paths).toEqual([
      '.github/facade.yml',
      '.github/facade/**',
      '.github/workflows/facade-pages.yml',
    ]);
    expect(triggers.push.branches).toEqual(['**']);
    expect(requireJob(standalone, 'build').if).toBe(defaultBranchCondition);
    expect(source).toContain('Publish a Release only after every asset upload is complete.');
    expect(source).toContain('must instead merge the chained workflow example');
  });

  it('chains Facade after the complete release-asset job', async () => {
    const chained = await readWorkflow(join('examples', 'workflows', 'facade-pages-after-release.yml'));
    expect(requireJob(chained, 'facade').needs).toBe('release-assets');
    expect(requireJob(chained, 'deploy').needs).toBe('facade');
    expect(requireJob(chained, 'release-assets').steps[0]?.run).toContain('upload every asset');
  });

  it('checks the regenerated Action bundle for drift in CI', async () => {
    const ci = await readWorkflow(join('.github', 'workflows', 'ci.yml'));
    const commands = requireJob(ci, 'build').steps
      .map((step) => step.run)
      .filter((run) => run !== undefined);
    expect(commands).toEqual([
      'corepack enable',
      'pnpm install --frozen-lockfile',
      'pnpm build',
      'git diff --exit-code -- action/dist/index.cjs',
    ]);
  });

  it('scans Action sources while excluding only the reproducible bundle from CodeQL', async () => {
    const workflowDocument = parseDocument(await readFile(join(repositoryRoot, '.github', 'workflows', 'codeql.yml'), 'utf8'));
    expect(workflowDocument.errors).toEqual([]);
    const workflow = workflowDocument.toJS() as { jobs: { analyze: { steps: Array<z.infer<typeof StepSchema>> } } };
    const init = workflow.jobs.analyze.steps.find((step) => step.uses === 'github/codeql-action/init@v4');
    expect(init?.with).toMatchObject({
      languages: '${{ matrix.language }}',
      'config-file': './.github/codeql/codeql-config.yml',
      'build-mode': 'none',
    });

    const config = parseDocument(await readFile(join(repositoryRoot, '.github', 'codeql', 'codeql-config.yml'), 'utf8'));
    expect(config.errors).toEqual([]);
    expect(config.toJS()).toEqual({ 'paths-ignore': ['action/dist/**'] });
  });
});

async function readWorkflow(path: string): Promise<Workflow> {
  return parseWorkflow(await readFile(join(repositoryRoot, path), 'utf8'));
}

function parseWorkflow(source: string): Workflow {
  const document = parseDocument(source);
  expect(document.errors).toEqual([]);
  return WorkflowSchema.parse(document.toJS());
}

function requireJob(workflow: Workflow, name: string): Job {
  const job = workflow.jobs[name];
  if (job === undefined) throw new Error('Missing workflow job: ' + name);
  return job;
}

function requireStep(job: Job, uses: string): z.infer<typeof StepSchema> {
  const step = job.steps.find((candidate) => candidate.uses === uses);
  if (step === undefined) throw new Error('Missing workflow step: ' + uses);
  return step;
}
