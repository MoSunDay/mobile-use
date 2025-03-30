/* eslint-disable no-console */
/**
 * Agent Task Integration Test
 *
 * This test executes a simple task using the Executor to verify functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Executor } from '../agent/executor';
import { getDefaultProviderConfig, ProviderTypeEnum } from '@/lib/settings';
import { createChatModel } from '../agent/helper';
import { writeFileSync } from 'fs';
import path from 'path';
import { AgentContext } from '../agent/types';
import { NavigatorActionRegistry } from '../agent/agents/navigator';
import MessageManager from '../agent/messages/service';
import { EventManager } from '../agent/event/manager';
import { ActionBuilder } from '../agent/actions/builder';
import { AgentEvent } from '../agent/event/types';
import Appium from '../mobile/appium';
import MobileContext from '../mobile/context';
import { formatElementsList } from '../mobile/androidViewProcessor';

describe('Executor Task Tests', () => {
  let mobileContext: MobileContext;
  beforeAll(async () => {
    const appium = new Appium();
    mobileContext = await appium.newContext();
  });

  afterAll(async () => {
    if (mobileContext) {
      await mobileContext.close();
    }
  });

  it.only('mobile app context', async () => {
    const state = await mobileContext.getState();
    // console.log(state)
    const text = formatElementsList(state.interactiveElements);
    console.log('clickable elements:\n', text);
    const providerConfig = getDefaultProviderConfig(ProviderTypeEnum.OpenAI);
    const modelConfig = {
      provider: ProviderTypeEnum.OpenAI,
      modelName: 'gpt-4o-mini',
    };
    const model = createChatModel(providerConfig, modelConfig);
    const messageManager = new MessageManager({});
    const eventManager = new EventManager();
    const context = new AgentContext('taskId', mobileContext, messageManager, eventManager, {});
    const actionBuilder = new ActionBuilder(context, model);
    const navigatorActionRegistry = new NavigatorActionRegistry(actionBuilder.buildAppiumActions());

    // const todo = { input_text: { desc: 'Input text into index 0', index: 2, text: 'center' } };
    // const todo = { scroll_down: { desc: 'Scroll Down' } };
    const todo = { scroll_up: { desc: 'Scroll Up' } };
    // const todo = { scroll_to_text: { desc: 'Scroll to target text', text: 'More options' } };
    const actionName = Object.keys(todo)[0];
    const actionArgs = Object.values(todo)[0];
    const action = navigatorActionRegistry.getAction(actionName);
    console.log('action:', JSON.stringify(action, null, 2));
    const result = await action?.call(actionArgs);
    console.log('action result:', JSON.stringify(result, null, 2));

    const newstate = await mobileContext.getState();
    const screenshot = newstate.screenshot;
    expect(screenshot).toBeDefined();
    //decode the base64 image
    const screenshotBuffer = Buffer.from(screenshot!!, 'base64');
    const screenshotPath = path.join(__dirname, 'screenshot.jpg');
    writeFileSync(screenshotPath, screenshotBuffer);
  });

  it('can execute mobile app task using Executor', async () => {
    // Initialize the Executor
    const task = `
open google chrome app and search for vibe coding
`;
    const taskId = 'test-task-id';
    const providerConfig = getDefaultProviderConfig(ProviderTypeEnum.OpenAI);
    const modelConfig = {
      provider: ProviderTypeEnum.OpenAI,
      modelName: 'gpt-4o',
    };
    const model = createChatModel(providerConfig, modelConfig);
    const executor = new Executor(task, taskId, mobileContext, model);
    executor.subscribeExecutionEvents(async (event: AgentEvent) => {
      console.log('event:', JSON.stringify(event));
    });
    // Execute the task
    const result = await executor.execute();
    console.log('Task execution result:', result);
  });
});
