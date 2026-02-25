import { useState, useEffect } from 'react';
import { HomeView } from './components/HomeView';
import { StepEditor } from './components/StepEditor';
import { ExportPanel } from './components/ExportPanel';
import { loadStepsForGuide } from '../shared/storage';
import type { Guide, RecordedStep, RecordingState } from '../shared/types';

type View = 'home' | 'editor' | 'export';

interface RecordingInfo {
  state: RecordingState;
  stepCount: number;
  guideId: string | null;
  guideTitle: string;
}

export function App() {
  const [view, setView] = useState<View>('home');
  const [recording, setRecording] = useState<RecordingInfo>({
    state: 'idle',
    stepCount: 0,
    guideId: null,
    guideTitle: '',
  });
  const [activeGuide, setActiveGuide] = useState<Guide | null>(null);
  const [activeSteps, setActiveSteps] = useState<RecordedStep[]>([]);

  // Fetch current recording state from background on mount
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
      if (response) {
        setRecording({
          state: response.state,
          stepCount: response.stepCount,
          guideId: response.guideId,
          guideTitle: response.guideTitle,
        });
      }
    });
  }, []);

  // Listen for STATE_UPDATE from background
  useEffect(() => {
    const listener = (message: { type: string; payload: RecordingInfo }) => {
      if (message.type === 'STATE_UPDATE') {
        setRecording(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  async function handleStartRecording(title: string) {
    chrome.runtime.sendMessage({ type: 'START_RECORDING', payload: { guideTitle: title } });
  }

  function handleStopRecording() {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  }

  function handlePauseRecording() {
    chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
  }

  async function openEditor(guide: Guide) {
    const steps = await loadStepsForGuide(guide.id);
    setActiveGuide(guide);
    setActiveSteps(steps);
    setView('editor');
  }

  async function openExport(guide: Guide) {
    const steps = await loadStepsForGuide(guide.id);
    setActiveGuide(guide);
    setActiveSteps(steps);
    setView('export');
  }

  if (view === 'editor' && activeGuide) {
    return (
      <StepEditor
        guide={activeGuide}
        initialSteps={activeSteps}
        onBack={() => setView('home')}
        onExport={(guide, steps) => {
          setActiveGuide(guide);
          setActiveSteps(steps);
          setView('export');
        }}
      />
    );
  }

  if (view === 'export' && activeGuide) {
    return (
      <ExportPanel
        guide={activeGuide}
        steps={activeSteps}
        onBack={() => setView(activeSteps.length > 0 ? 'editor' : 'home')}
      />
    );
  }

  return (
    <HomeView
      recordingState={recording.state}
      stepCount={recording.stepCount}
      guideTitle={recording.guideTitle}
      onStartRecording={handleStartRecording}
      onStopRecording={handleStopRecording}
      onPauseRecording={handlePauseRecording}
      onEditGuide={openEditor}
      onExportGuide={openExport}
    />
  );
}
