  function getStageBlockId(stage) {
    if (stage === 'company') return 'company';
    if (stage === 'endpoints') return 'endpoints';
    if (stage === 'ringGroups') return 'ringGroups';
    if (['gsmNumbers', 'gsmTemporaryOpen', 'gsmTemporaryFind'].includes(stage)) return 'gsmNumbers';
    if (stage === 'departments') return 'departments';
    if (stage === 'voiceMessages') return 'voiceMessages';
    if (stage === 'feedback') return 'feedback';
    if (['scenarios', 'schedule', 'bindIncomingNumber'].includes(stage)) return 'scenarios';
    if (stage === 'manualRouteGate') return '';
    return '';
  }

  function getNextStageAfterBlock(blockId) {
    return {
      company: 'endpoints', endpoints: 'ringGroups', ringGroups: 'gsmNumbers',
      gsmNumbers: 'departments', departments: 'voiceMessages', voiceMessages: 'feedback',
      feedback: 'scenarios',
      scenarios: 'manualRouteGate',
    }[blockId] || 'complete';
  }

  function getBlockSkipReason(draft, flow, blockId) {
    if (!blockId) return '';
    if (getBlockState(draft, blockId).ignored) return 'інженер позначив блок «Ігнорувати»';
    const block = TZ_BLOCKS.find(item => item.id === blockId);
    const failed = flow.failedBlocks || {};
    const dependencies = [...(block?.dependsOn || [])];
    if (blockId === 'scenarios') {
      const actionTypes = new Set(getScenarioSpecs(draft).flatMap(item => item.actions.map(action => action.type)));
      if (actionTypes.has('endpoint')) dependencies.push('endpoints');
      if (actionTypes.has('ringGroup')) dependencies.push('ringGroups');
      if (actionTypes.has('voice')) dependencies.push('voiceMessages');
      if (getScenarioSpecs(draft).some(item => clean(item.feedbackName))) dependencies.push('feedback');
    }
    const dependency = [...new Set(dependencies)].find(id => getBlockState(draft, id).ignored || failed[id]);
    if (dependency) return `не виконана залежність «${TZ_BLOCKS.find(item => item.id === dependency)?.title || dependency}»`;
    return '';
  }

  function finishExecution(flow) {
    clearFlow();
    const failed = Object.entries(flow.failedBlocks || {});
    const skipped = flow.skippedBlocks || [];
    const lines = ['Виконання завершено.', failed.length ? 'Помилки:' : 'Помилок немає.'];
    failed.forEach(([id, message]) => lines.push(`• Блок ${TZ_BLOCKS.find(item => item.id === id)?.number || id}: ${message}`));
    if (skipped.length) {
      lines.push('Пропущено:');
      skipped.forEach(item => lines.push(`• Блок ${TZ_BLOCKS.find(block => block.id === item.id)?.number || item.id}: ${item.reason}`));
    }
    lines.push('Блоки 9, 10 і 12: перевіряє інженер вручну.');
    const message = lines.join('\n');
    log(message, failed.length ? 'warn' : 'success');
    showCenterAlert(message, failed.length ? 'warn' : 'success');
  }

  async function runAutomaticFlow() {
    if (stopRequested) {
      clearFlow();
      log('Виконання зупинено.', 'warn');
      return;
    }

    const draft = loadDraft();
    validateDraft(draft);
    const flow = saveFlow(loadFlow() || { stage: 'context', index: 0 });
    assertCurrentProjectContext(draft, flow);

    if (flow.stage === 'context') return ensurePanelContext(draft);
    if (flow.stage === 'externalDependencies') return verifyExternalDependencies();

    const blockId = getStageBlockId(flow.stage);
    const skipReason = getBlockSkipReason(draft, flow, blockId);
    if (skipReason) {
      const skippedBlocks = [...(flow.skippedBlocks || [])];
      if (!skippedBlocks.some(item => item.id === blockId)) skippedBlocks.push({ id: blockId, reason: skipReason });
      const nextStage = getNextStageAfterBlock(blockId);
      const nextFlow = saveFlow({ stage: nextStage, index: 0, skippedBlocks });
      log(`Блок ${TZ_BLOCKS.find(item => item.id === blockId)?.number}: пропущено — ${skipReason}.`, 'warn');
      if (nextStage === 'complete') return finishExecution(nextFlow);
      return runAutomaticFlow();
    }

    try {
      if (flow.stage === 'company') return await applyCompanyParams();
      if (flow.stage === 'endpoints') return await applyEndpoints();
      if (flow.stage === 'ringGroups') return await applyRingGroups();
      if (flow.stage === 'gsmNumbers') return await applyGsmNumbers();
      if (flow.stage === 'gsmTemporaryOpen') return await applyGsmTemporaryOpen();
      if (flow.stage === 'gsmTemporaryFind') return await applyGsmTemporaryFind();
      if (flow.stage === 'departments') return await applyDepartments();
      if (flow.stage === 'voiceMessages') return await applyStandardVoiceMessages();
      if (flow.stage === 'feedback') return await applyFeedback();
      if (flow.stage === 'scenarios') return await applyScenarios();
      if (flow.stage === 'schedule') return await applySchedule();
      if (flow.stage === 'bindIncomingNumber') return await bindIncomingNumber();
      if (flow.stage === 'manualRouteGate') return stopAtVerifiedRouteGate();
      return finishExecution(flow);
    } catch (error) {
      if (!blockId) throw error;
      const failedBlocks = { ...(flow.failedBlocks || {}), [blockId]: error.message || String(error) };
      const nextStage = getNextStageAfterBlock(blockId);
      const nextFlow = saveFlow({ stage: nextStage, index: 0, failedBlocks });
      log(`Блок ${TZ_BLOCKS.find(item => item.id === blockId)?.number} впав: ${failedBlocks[blockId]}. Переходжу до незалежних блоків.`, 'error');
      if (nextStage === 'complete') return finishExecution(nextFlow);
      return runAutomaticFlow();
    }
  }
