  function boot() {
    if (location.hostname === 'docs.google.com' && location.pathname.includes('/spreadsheets/')) {
      renderGoogleSheetCapture();
      window.setInterval(renderGoogleSheetCapture, 2000);
      return;
    }
    if (!isPanelPage()) return;
    renderPanel();
    verifyPendingDeleteResult();

    const flow = loadFlow();
    if (!flow || !flow.active) return;

    const currentCompany = getCompanyIdFromUrl();
    const currentProject = getProjectIdFromUrl();
    const expectedCompany = clean(flow.companyId || loadDraft().companyId);
    const expectedProject = clean(flow.projectId || loadDraft().projectId);

    if (
      expectedCompany &&
      currentCompany &&
      (currentCompany !== expectedCompany || (expectedProject && !isProjectAgnosticModule() && currentProject !== expectedProject))
    ) {
      clearFlow();
      setStatus('Автозапуск зупинено: відкрита інша компанія або проєкт.', 'warn');
      return;
    }

    setTimeout(() => runWithStop(runAutomaticFlow), 500);
  }

  if (globalThis.__BINOTEL_TZ_HELPER_TEST__) {
    globalThis.__BINOTEL_TZ_HELPER_TEST_API__ = {
      parseTzSnapshot,
      tzVoiceKey,
      getFeedbackSpecs,
      feedbackVoicePath,
      getScenarioSpecs,
      validateDraft,
      isValidEndpointNumber,
      makeScheduleRuleString,
      buildExecutionPlan,
      applyStructuredCompatibility,
    };
  } else {
    boot();
  }
})();
