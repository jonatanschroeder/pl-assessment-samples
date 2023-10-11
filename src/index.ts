import * as path from 'path';
import * as fs from 'fs';
import { chromium } from 'playwright';
import { promisify } from 'util';

(async () => {
  const config_file = await promisify(fs.readFile)('config.json', { encoding: 'utf-8' });
  const config: {
    AUTHN_TOKEN: string; // Copy this from browser
    SERVER: string;
    COURSE_INSTANCE_ID: number;
    STUDENT_UID: Record<string, string>;
    ASSESSMENTS_IGNORE: string;
  } = JSON.parse(config_file);

  const base_url = `https://${config.SERVER}/pl/course_instance/${config.COURSE_INSTANCE_ID}`;
  const assessments_ignore = new RegExp(config.ASSESSMENTS_IGNORE);

  const browser = await chromium.launch();
  const browserContext = await browser.newContext();
  const page = await browserContext.newPage();

  await page.goto(base_url);
  await browserContext.addCookies([
    {
      name: 'pl_authn',
      value: config.AUTHN_TOKEN,
      domain: config.SERVER,
      path: '/',
    },
  ]);
  await page.goto(`${base_url}/instructor/instance_admin/assessments`);

  const blank_directory = path.join('results', 'blank');

  if (!fs.existsSync('results')) fs.mkdirSync('results');
  if (!fs.existsSync(blank_directory)) fs.mkdirSync(blank_directory);

  await page.pdf({
    path: path.join(blank_directory, 'assessments.pdf'),
    printBackground: true,
  });

  const urls = await page
    .locator(
      `a[href^="/pl/course_instance/${config.COURSE_INSTANCE_ID}/instructor/assessment"][role="button"]`,
    )
    .evaluateAll((links: HTMLAnchorElement[]) =>
      links.map((link) => ({ href: link.href, name: link.textContent?.trim() })),
    );

  for (const assessment of urls) {
    if (assessment.name.match(assessments_ignore)) continue;
    console.log(assessment.name);
    const assessment_dir = path.join(blank_directory, assessment.name);
    if (!fs.existsSync(assessment_dir)) fs.mkdirSync(assessment_dir);

    await page.goto(assessment.href);
    await page.pdf({
      path: path.join(assessment_dir, 'overview.pdf'),
      printBackground: true,
    });

    const questions = await page
      .locator(`a[href^="/pl/course_instance/${config.COURSE_INSTANCE_ID}/instructor/question"]`)
      .evaluateAll((links: HTMLAnchorElement[]) =>
        links.map((link) => ({
          href: link.href,
          name:
            'Q' +
            link.textContent
              .trim()
              .split(' ')[0]
              .replace(/[^a-zA-Z0-9]+$/, ''),
        })),
      );

    for (const question of questions) {
      console.log('-- ', question.name);

      await page.goto(question.href);
      await page.pdf({
        path: path.join(assessment_dir, `${question.name}.pdf`),
        printBackground: true,
      });

      await page.locator('button[value="save"]').click();
      await page.locator('div.submission-header .expand-icon-container').click();

      await page.pdf({
        path: path.join(assessment_dir, `${question.name}-solution.pdf`),
        printBackground: true,
      });
    }
  }

  for (const uid_key in config.STUDENT_UID) {
    const uid = config.STUDENT_UID[uid_key];

    console.log(`*** STUDENT: ${uid} (${uid_key})`);

    await browserContext.addCookies([
      {
        name: 'pl_requested_course_instance_role',
        value: 'Student%20Data%20Viewer',
        domain: config.SERVER,
        path: '/',
      },
      {
        name: 'pl_requested_course_role',
        value: 'Owner',
        domain: config.SERVER,
        path: '/',
      },
      {
        name: 'pl_requested_uid',
        value: uid,
        domain: config.SERVER,
        path: '/',
      },
    ]);
    await page.goto(`${base_url}/assessments`);

    const user_directory = path.join('results', uid_key);
    if (!fs.existsSync(user_directory)) fs.mkdirSync(user_directory);

    await page.pdf({
      path: path.join(user_directory, 'assessments.pdf'),
      printBackground: true,
    });

    const urls = await page
      .locator(
        `a[href^="/pl/course_instance/${config.COURSE_INSTANCE_ID}/assessment_instance"][data-testid="assessment-set-badge"]`,
      )
      .evaluateAll((links: HTMLAnchorElement[]) =>
        links.map((link) => ({
          href: link.href,
          name: link.textContent.trim(),
        })),
      );

    for (const ai of urls) {
      if (ai.name.match(assessments_ignore)) continue;
      console.log(ai.name);
      const ai_dir = path.join(user_directory, ai.name);
      if (!fs.existsSync(ai_dir)) fs.mkdirSync(ai_dir);

      await page.goto(ai.href);
      await page.pdf({
        path: path.join(ai_dir, 'overview.pdf'),
        printBackground: true,
      });

      const questions = await page
        .locator(`a[href^="/pl/course_instance/${config.COURSE_INSTANCE_ID}/instance_question"]`)
        .evaluateAll((links: HTMLAnchorElement[]) =>
          links.map((link) => ({
            href: link.href,
            name: link.textContent.trim(),
          })),
        );

      for (const iq of questions) {
        const q_name = iq.name.startsWith('Question ')
          ? iq.name
          : iq.name.split(' ')[0].replace(/[.]+$/, '');
        console.log('-- ', q_name);

        await page.goto(iq.href);
        await page.pdf({
          path: path.join(ai_dir, `${q_name}.pdf`),
          printBackground: true,
        });

        const downloads = await page
          .locator('.question-body .file-upload-status a[download]')
          .evaluateAll((files: HTMLAnchorElement[]) =>
            files.map((file) => ({ filename: file.download, href: file.href })),
          );
        for (const file of downloads) {
          //const data = await (await fetch(file.href)).blob();
          fs.writeFileSync(
            path.join(ai_dir, `${q_name}_${file.filename}`),
            Buffer.from(file.href.split(',')[1], 'base64'),
          );
        }
      }
    }
  }

  await browser.close();
})();
