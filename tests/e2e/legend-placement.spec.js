import { test, expect } from '@playwright/test';
import { collaboratorPackage } from '../helpers/dashboardPackageFixtures.js';
import { serializeDashboardBundle } from '../../src/charting/config/dashboardBundleV3.js';
import { enterBuildMode, chooseWholeDashboardPackage } from './support/buildWorkflow.js';
import { chartAuthoringWorkflow } from './support/chart-authoring-workflow.js';

const STORAGE = 'simex-dashboard-config-v3-three-mode-v1';
async function setup(page) {
  await page.setViewportSize({ width: 1460, height: 1000 });
  await page.addInitScript(() => performance.setResourceTimingBufferSize(4000));
  await page.goto('/'); await enterBuildMode(page);
  const config = structuredClone(collaboratorPackage().config);
  delete config.datasetProfiles;
  config.dataSources.cases.csvText = 'date,value,category\n2026-08-21,4,A\n2026-08-22,7,B\n2026-08-23,5,C\n';
  const [line, pie] = config.pages[0].sections[0].panels.map(p => p.chart);
  line.title = 'Legend axis';
  pie.title = 'Legend pie'; pie.typeId = 'pie'; pie.roles = { category: { field: 'category' }, value: { field: 'value' } };
  pie.interaction.zoom.enabled = false;
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Load dashboard package', exact: true }).click();
  await (await chooser).setFiles({ name: 'legend.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(serializeDashboardBundle(config))) });
  const review = page.getByRole('dialog', { name: 'Review package contents' });
  await chooseWholeDashboardPackage(review); await review.getByRole('button', { name: 'Load package', exact: true }).click();
  await expect(review).toHaveCount(0);
}
async function quick(page, title) {
  await page.getByRole('treeitem', { name: title, exact: true }).click();
  const editor = page.locator('.chart-quick-editor');
  await expect(editor.getByLabel('Legend placement', { exact: true })).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Move legend', exact: true })).toBeVisible();
  return editor;
}
async function geometry(editor) {
  return editor.locator('.chart-echarts-host').first().evaluate(async host => {
    const url = performance.getEntriesByType('resource').find(r => /\/deps\/echarts\.js\?/.test(r.name))?.name;
    const { getInstanceByDom } = await import(url);
    const instance = getInstanceByDom(host), model = instance.getModel().getComponent('legend', 0);
    const view = instance.getViewOfComponentModel(model), element = view._backgroundEl;
    element.getComputedTransform();
    const bounds = element.getBoundingRect(), [x,y] = element.transformCoordToGlobal(bounds.x, bounds.y);
    const item=view.getContentGroup().childAt(0), ib=item.getBoundingRect(); item.getComputedTransform();
    const [ix,iy]=item.transformCoordToGlobal(ib.x+8,ib.y+ib.height/2);
    const grid = instance.getModel().getComponent('grid', 0)?.coordinateSystem?.getRect();
    return { item:{x:ix,y:iy},x,y,width:bounds.width,height:bounds.height, canvasWidth:instance.getWidth(),canvasHeight:instance.getHeight(), grid: grid && { x:grid.x,y:grid.y,width:grid.width,height:grid.height }, zoom: instance.getOption().dataZoom?.[0] && { start:instance.getOption().dataZoom[0].start,end:instance.getOption().dataZoom[0].end }, selected: instance.getOption().legend[0].selected };
  });
}
function within(r) { expect(r.x).toBeGreaterThanOrEqual(3); expect(r.y).toBeGreaterThanOrEqual(3); expect(r.x+r.width).toBeLessThanOrEqual(r.canvasWidth-2); expect(r.y+r.height).toBeLessThanOrEqual(r.canvasHeight-2); }
async function saved(page, id) { return page.evaluate(({ key,id }) => JSON.parse(localStorage.getItem(key)).pages.flatMap(p=>p.sections).flatMap(s=>s.panels).find(p=>p.chart.id===id).chart, { key:STORAGE,id }); }

test('legend axis presets offsets drag cancellation quick-full save and responsive restoration', async ({ page }) => {
  test.setTimeout(80_000);
  await setup(page); let editor = await quick(page, 'Legend axis');
  await expect(editor.getByLabel('Horizontal offset', { exact:true })).toBeDisabled();
  await editor.getByLabel('Legend placement', { exact:true }).selectOption('inside-top-left');
  const start = await geometry(editor); within(start);
  await editor.getByLabel('Horizontal offset', { exact:true }).fill('22');
  await expect.poll(async () => (await geometry(editor)).x).toBeCloseTo(start.x+22, 0);
  await editor.getByLabel('Legend placement', { exact:true }).selectOption('right-middle');
  await expect(editor.getByLabel('Horizontal offset', { exact:true })).toHaveValue('0');
  const side = await geometry(editor); within(side);
  expect(side.grid.width).toBeLessThan(start.grid.width);
  expect(side.x).toBeGreaterThanOrEqual(side.grid.x+side.grid.width-1);
  await editor.getByRole('button', { name:'Open full editor', exact:true }).click();
  editor = page.getByRole('dialog', { name:'Edit chart', exact:true });
  await chartAuthoringWorkflow(editor, { mode:'edit' }).goToConfigure();
  await expect(editor.getByLabel('Legend placement', { exact:true })).toHaveValue('right-middle');
  await editor.getByLabel('Legend placement', { exact:true }).selectOption('inside-top-left');
  const before = await geometry(editor), handle = editor.getByRole('button', { name:'Move legend', exact:true });
  let box = await handle.boundingBox();
  await page.mouse.move(box.x+8,box.y+8); await page.mouse.down(); await page.mouse.move(box.x+110,box.y+90,{ steps:8 });
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(editor.getByLabel('Legend placement', { exact:true })).toHaveValue('inside-top-left');
  expect((await geometry(editor)).x).toBeCloseTo(before.x,0);
  box = await handle.boundingBox();
  await page.mouse.move(box.x+8,box.y+8); await page.mouse.down(); await page.mouse.move(box.x+80,box.y+150,{ steps:8 });
  const dropped = await geometry(editor); await page.mouse.up();
  await expect.poll(async () => (await geometry(editor)).y).toBeCloseTo(dropped.y,0);
  expect((await geometry(editor)).x).toBeCloseTo(dropped.x,0);
  await editor.locator('[data-icon-control="editor.save-changes"]').click(); await expect(editor).toHaveCount(0);
  const legend = (await saved(page,'chart-a')).presentation.legend;
  expect(legend.position).not.toBe('inside-top-left');
  await page.reload(); editor = await quick(page,'Legend axis');
  await expect(editor.getByLabel('Legend placement', { exact:true })).toHaveValue(legend.position);
  await page.setViewportSize({ width:900,height:1000 }); within(await geometry(editor));
  await page.setViewportSize({ width:1460,height:1000 });
  await editor.getByLabel('Legend placement', { exact:true }).selectOption('above-left');
  const current = await geometry(editor), host = await editor.locator('.chart-echarts-host').first().boundingBox();
  const sx=host.width/current.canvasWidth, sy=host.height/current.canvasHeight;
  await page.mouse.move(host.x+(current.grid.x+current.grid.width/2)*sx,host.y+(current.grid.y+current.grid.height/2)*sy);
  await page.keyboard.down('Control'); await page.mouse.wheel(0,-250); await page.keyboard.up('Control');
  await expect.poll(async () => (await geometry(editor)).zoom.end-(await geometry(editor)).zoom.start).toBeLessThan(100);
  expect((await saved(page,'chart-a')).presentation.legend).toEqual(legend);
});

test('composition legend interior exterior and numeric placement preserve legend item interaction', async ({ page }) => {
  test.setTimeout(50_000); await setup(page);
  const editor = await quick(page,'Legend pie');
  for (const placement of ['inside-bottom-right','below-center','left-middle','above-right']) {
    await editor.getByLabel('Legend placement', { exact:true }).selectOption(placement);
    within(await geometry(editor));
  }
  await editor.getByLabel('Legend placement', { exact:true }).selectOption('inside-top-left');
  const r = await geometry(editor);
  await editor.getByLabel('Vertical offset', { exact:true }).fill('20');
  await expect.poll(async () => (await geometry(editor)).y).toBeCloseTo(r.y+20,0);
  await editor.locator('.chart-echarts-host').first().scrollIntoViewIfNeeded();
  const clickable=await geometry(editor), host=await editor.locator('.chart-echarts-host').first().boundingBox();
  await page.mouse.click(host.x+clickable.item.x*host.width/clickable.canvasWidth,host.y+clickable.item.y*host.height/clickable.canvasHeight);
  await expect.poll(async()=>Object.values((await geometry(editor)).selected).includes(false)).toBe(true);
  await editor.getByRole('button', { name:'Save',exact:true }).click();
  await expect.poll(async()=> (await saved(page,'chart-b')).presentation.legend.offsetY).toBe(20);
});

test('Automatic legend pointer preflight resolves a preset without a drop jump', async ({page})=>{
  test.setTimeout(40_000); await setup(page); const editor=await quick(page,'Legend axis');
  const move=editor.getByRole('button',{name:'Move legend',exact:true}); await move.hover();
  const box=await move.boundingBox(), x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+65,y+100,{steps:6});
  const dropped=await geometry(editor); await page.mouse.up();
  await expect(editor.getByLabel('Legend placement',{exact:true})).not.toHaveValue('automatic');
  await expect.poll(async()=>(await geometry(editor)).y).toBeCloseTo(dropped.y,0);
  expect((await geometry(editor)).x).toBeCloseTo(dropped.x,0);
});
